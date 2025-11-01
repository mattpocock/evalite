import type { Evalite } from "../types.js";
import type { ReporterEvent } from "./events.js";

export interface EvaliteRunnerOptions {
  storage: Evalite.Storage;
  logNewState: (event: Evalite.ServerState) => void;
  modifyExitCode: (exitCode: number) => void;
  scoreThreshold: number | undefined;
}

export class EvaliteRunner {
  private opts: EvaliteRunnerOptions;
  private state: Evalite.ServerState = { type: "idle" };
  private didLastRunFailThreshold: "yes" | "no" | "unknown" = "unknown";
  private collectedResults: Map<string, Evalite.Eval> = new Map();
  private eventQueue: Promise<void> = Promise.resolve();

  constructor(opts: EvaliteRunnerOptions) {
    this.opts = opts;
  }

  getState(): Evalite.ServerState {
    return this.state;
  }

  getDidLastRunFailThreshold(): "yes" | "no" | "unknown" {
    return this.didLastRunFailThreshold;
  }

  getAllScores(): Evalite.Score[] {
    return Array.from(this.collectedResults.values()).flatMap(
      (_eval) => _eval.scores
    );
  }

  getSuccessfulResults(): Evalite.Eval[] {
    return Array.from(this.collectedResults.values()).filter(
      (_eval) => _eval.status === "success"
    );
  }

  getScoresForModule(moduleId: string): Evalite.Score[] {
    return Array.from(this.collectedResults.values())
      .filter((_eval) => _eval.filepath === moduleId)
      .flatMap((_eval) => _eval.scores);
  }

  handleTestSummary(data: {
    failedTasksCount: number;
    averageScore: number | null;
  }): void {
    // Set exit code to 1 if there are any failed tasks
    if (data.failedTasksCount > 0) {
      this.opts.modifyExitCode(1);
    }

    // Handle threshold checking
    if (typeof this.opts.scoreThreshold === "number") {
      if (
        data.averageScore === null ||
        data.averageScore * 100 < this.opts.scoreThreshold
      ) {
        this.opts.modifyExitCode(1);
        this.didLastRunFailThreshold = "yes";
      } else {
        // Only set exit code to 0 if there are no failed tasks
        if (data.failedTasksCount === 0) {
          this.opts.modifyExitCode(0);
        }
        this.didLastRunFailThreshold = "no";
      }
    }
  }

  updateState(state: Evalite.ServerState) {
    this.state = state;
    this.opts.logNewState(state);
  }

  /**
   * Wait for all queued events to complete processing
   */
  async waitForCompletion(): Promise<void> {
    await this.eventQueue;
  }

  /**
   * Handles the state management for the reporter
   */
  sendEvent(event: ReporterEvent): void {
    this.eventQueue = this.eventQueue.then(async () => {
      await this.processEvent(event);
    });
  }

  private async processEvent(event: ReporterEvent): Promise<void> {
    switch (this.state.type) {
      case "running":
        switch (event.type) {
          case "RUN_ENDED":
            this.updateState({ type: "idle" });
            break;
          case "EVAL_STARTED":
            {
              const run: Evalite.Storage.Entities.Run = this.state.runId
                ? (
                    await this.opts.storage.runs.getMany({
                      ids: [this.state.runId as number],
                      limit: 1,
                    })
                  )[0]!
                : await this.opts.storage.runs.create({
                    runType: this.state.runType,
                  });

              // Check if eval already exists for this run
              const existingSuites = await this.opts.storage.suites.getMany({
                runIds: [run.id],
                name: event.initialEval.suiteName,
              });

              const suite =
                existingSuites[0] ??
                (await this.opts.storage.suites.create({
                  filepath: event.initialEval.filepath,
                  name: event.initialEval.suiteName,
                  runId: run.id,
                  variantName: event.initialEval.variantName,
                  variantGroup: event.initialEval.variantGroup,
                }));

              const _eval = await this.opts.storage.evals.create({
                suiteId: suite.id,
                order: event.initialEval.order,
                input: "",
                expected: "",
                output: null,
                duration: 0,
                status: "running",
                renderedColumns: [],
                trialIndex: event.initialEval.trialIndex,
              });

              this.updateState({
                ...this.state,
                suiteNamesRunning: [
                  ...this.state.suiteNamesRunning,
                  event.initialEval.suiteName,
                ],
                evalIdsRunning: [...this.state.evalIdsRunning, _eval.id],
                runId: run.id,
              });
            }

            break;
          case "EVAL_SUBMITTED":
            {
              // Store eval in memory for reporting
              const evalKey = `${event.eval.filepath}:${event.eval.suiteName}:${event.eval.order}`;
              this.collectedResults.set(evalKey, event.eval);

              const run = this.state.runId
                ? (
                    await this.opts.storage.runs.getMany({
                      ids: [this.state.runId as number],
                      limit: 1,
                    })
                  )[0]!
                : await this.opts.storage.runs.create({
                    runType: this.state.runType,
                  });

              // Check if eval already exists for this run
              const existingSuites = await this.opts.storage.suites.getMany({
                runIds: [run.id],
                name: event.eval.suiteName,
              });

              const suite =
                existingSuites[0] ??
                (await this.opts.storage.suites.create({
                  filepath: event.eval.filepath,
                  name: event.eval.suiteName,
                  runId: run.id,
                  variantName: event.eval.variantName,
                  variantGroup: event.eval.variantGroup,
                }));

              const existingEvals = await this.opts.storage.evals.getMany({
                suiteIds: [suite.id],
                order: event.eval.order,
              });

              let evalId: number;
              const existingEval = existingEvals[0];

              if (existingEval) {
                const updated = await this.opts.storage.evals.update({
                  id: existingEval.id,
                  output: event.eval.output,
                  duration: event.eval.duration,
                  status: event.eval.status,
                  renderedColumns: event.eval.renderedColumns,
                  input: event.eval.input,
                  expected: event.eval.expected,
                  trialIndex: event.eval.trialIndex,
                });
                evalId = updated.id;
              } else {
                const created = await this.opts.storage.evals.create({
                  suiteId: suite.id,
                  order: event.eval.order,
                  input: event.eval.input,
                  expected: event.eval.expected,
                  output: event.eval.output,
                  duration: event.eval.duration,
                  status: event.eval.status,
                  renderedColumns: event.eval.renderedColumns,
                  trialIndex: event.eval.trialIndex,
                });
                evalId = created.id;
              }

              for (const score of event.eval.scores) {
                await this.opts.storage.scores.create({
                  evalId: evalId,
                  description: score.description,
                  name: score.name,
                  score: score.score ?? 0,
                  metadata: score.metadata,
                });
              }

              let traceOrder = 0;
              for (const trace of event.eval.traces) {
                traceOrder++;
                await this.opts.storage.traces.create({
                  evalId: evalId,
                  input: trace.input,
                  output: trace.output,
                  start: trace.start,
                  end: trace.end,
                  inputTokens: trace.usage?.inputTokens,
                  outputTokens: trace.usage?.outputTokens,
                  totalTokens: trace.usage?.totalTokens,
                  order: traceOrder,
                });
              }

              const allEvals = await this.opts.storage.evals.getMany({
                suiteIds: [suite.id],
              });

              const evalIdsRunning = this.state.evalIdsRunning.filter(
                (id) => id !== evalId
              );

              /**
               * The eval is complete if all results are no longer
               * running
               */
              const isSuiteComplete = allEvals.every(
                (_eval) => !evalIdsRunning.includes(_eval.id)
              );

              // Update the eval status and duration
              if (isSuiteComplete) {
                await this.opts.storage.suites.update({
                  id: suite.id,
                  status: allEvals.some((e) => e.status === "fail")
                    ? "fail"
                    : "success",
                });
              }

              this.updateState({
                ...this.state,
                suiteNamesRunning: isSuiteComplete
                  ? this.state.suiteNamesRunning.filter(
                      (name) => name !== event.eval.suiteName
                    )
                  : this.state.suiteNamesRunning,
                evalIdsRunning: evalIdsRunning,
                runId: run.id,
              });
            }

            break;

          default:
            throw new Error(`${event.type} not allowed in ${this.state.type}`);
        }
      case "idle": {
        switch (event.type) {
          case "RUN_BEGUN":
            // Clear collected results for new run
            this.collectedResults.clear();

            this.updateState({
              filepaths: event.filepaths,
              runType: event.runType,
              type: "running",
              runId: undefined, // Run is created lazily
              suiteNamesRunning: [],
              evalIdsRunning: [],
            });
            break;
        }
      }
    }
  }
}

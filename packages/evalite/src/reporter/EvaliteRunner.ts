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
  private collectedResults: Map<string, Evalite.Result> = new Map();
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
      (result) => result.scores
    );
  }

  getSuccessfulResults(): Evalite.Result[] {
    return Array.from(this.collectedResults.values()).filter(
      (result) => result.status === "success"
    );
  }

  getScoresForModule(moduleId: string): Evalite.Score[] {
    return Array.from(this.collectedResults.values())
      .filter((result) => result.filepath === moduleId)
      .flatMap((result) => result.scores);
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
          case "RESULT_STARTED":
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
              const existingEvals = await this.opts.storage.evals.getMany({
                runIds: [run.id],
                name: event.initialResult.evalName,
              });

              const evaluation =
                existingEvals[0] ??
                (await this.opts.storage.evals.create({
                  filepath: event.initialResult.filepath,
                  name: event.initialResult.evalName,
                  runId: run.id,
                  variantName: event.initialResult.variantName,
                  variantGroup: event.initialResult.variantGroup,
                }));

              const result = await this.opts.storage.results.create({
                evalId: evaluation.id,
                order: event.initialResult.order,
                input: "",
                expected: "",
                output: null,
                duration: 0,
                status: "running",
                renderedColumns: [],
                trialIndex: event.initialResult.trialIndex,
              });

              this.updateState({
                ...this.state,
                evalNamesRunning: [
                  ...this.state.evalNamesRunning,
                  event.initialResult.evalName,
                ],
                resultIdsRunning: [...this.state.resultIdsRunning, result.id],
                runId: run.id,
              });
            }

            break;
          case "RESULT_SUBMITTED":
            {
              // Store result in memory for reporting
              const resultKey = `${event.result.filepath}:${event.result.evalName}:${event.result.order}`;
              this.collectedResults.set(resultKey, event.result);

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
              const existingEvals = await this.opts.storage.evals.getMany({
                runIds: [run.id],
                name: event.result.evalName,
              });

              const evaluation =
                existingEvals[0] ??
                (await this.opts.storage.evals.create({
                  filepath: event.result.filepath,
                  name: event.result.evalName,
                  runId: run.id,
                  variantName: event.result.variantName,
                  variantGroup: event.result.variantGroup,
                }));

              const existingResults = await this.opts.storage.results.getMany({
                evalIds: [evaluation.id],
                order: event.result.order,
              });

              let resultId: number;
              const existingResult = existingResults[0];

              if (existingResult) {
                const updated = await this.opts.storage.results.update({
                  id: existingResult.id,
                  output: event.result.output,
                  duration: event.result.duration,
                  status: event.result.status,
                  renderedColumns: event.result.renderedColumns,
                  input: event.result.input,
                  expected: event.result.expected,
                  trialIndex: event.result.trialIndex,
                });
                resultId = updated.id;
              } else {
                const created = await this.opts.storage.results.create({
                  evalId: evaluation.id,
                  order: event.result.order,
                  input: event.result.input,
                  expected: event.result.expected,
                  output: event.result.output,
                  duration: event.result.duration,
                  status: event.result.status,
                  renderedColumns: event.result.renderedColumns,
                  trialIndex: event.result.trialIndex,
                });
                resultId = created.id;
              }

              for (const score of event.result.scores) {
                await this.opts.storage.scores.create({
                  resultId: resultId,
                  description: score.description,
                  name: score.name,
                  score: score.score ?? 0,
                  metadata: score.metadata,
                });
              }

              let traceOrder = 0;
              for (const trace of event.result.traces) {
                traceOrder++;
                await this.opts.storage.traces.create({
                  resultId: resultId,
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

              const allResults = await this.opts.storage.results.getMany({
                evalIds: [evaluation.id],
              });

              const resultIdsRunning = this.state.resultIdsRunning.filter(
                (id) => id !== resultId
              );

              /**
               * The eval is complete if all results are no longer
               * running
               */
              const isEvalComplete = allResults.every(
                (result) => !resultIdsRunning.includes(result.id)
              );

              // Update the eval status and duration
              if (isEvalComplete) {
                await this.opts.storage.evals.update({
                  id: evaluation.id,
                  status: allResults.some((r) => r.status === "fail")
                    ? "fail"
                    : "success",
                });
              }

              this.updateState({
                ...this.state,
                evalNamesRunning: isEvalComplete
                  ? this.state.evalNamesRunning.filter(
                      (name) => name !== event.result.evalName
                    )
                  : this.state.evalNamesRunning,
                resultIdsRunning,
                runId: run.id,
              });
            }

            break;

          default:
            throw new Error(`${event.type} not allowed in ${this.state.type}`);
        }
      // eslint-disable-next-line no-fallthrough
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
              evalNamesRunning: [],
              resultIdsRunning: [],
            });
            break;
        }
      }
    }
  }
}

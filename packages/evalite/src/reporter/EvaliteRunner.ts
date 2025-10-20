import { performance } from "node:perf_hooks";
import {
  createEvalIfNotExists,
  createRun,
  findResultByEvalIdAndOrder,
  getAllResultsForEval,
  insertResult,
  insertScore,
  insertTrace,
  updateEvalStatusAndDuration,
  updateResult,
  type SQLiteDatabase,
} from "../db.js";
import type { Evalite } from "../types.js";
import type { ReporterEvent } from "./events.js";

export interface EvaliteRunnerOptions {
  db: SQLiteDatabase;
  logNewState: (event: Evalite.ServerState) => void;
  modifyExitCode: (exitCode: number) => void;
  scoreThreshold: number | undefined;
}

export class EvaliteRunner {
  private opts: EvaliteRunnerOptions;
  private state: Evalite.ServerState = { type: "idle" };
  private didLastRunFailThreshold: "yes" | "no" | "unknown" = "unknown";
  private collectedResults: Map<string, Evalite.Result> = new Map();
  private evalStartTimes: Map<number | bigint, number> = new Map();

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
   * Handles the state management for the reporter
   */
  sendEvent(event: ReporterEvent): void {
    switch (this.state.type) {
      case "running":
        switch (event.type) {
          case "RUN_ENDED":
            this.updateState({ type: "idle" });
            break;
          case "RESULT_STARTED":
            {
              const runId =
                this.state.runId ??
                createRun({
                  db: this.opts.db,
                  runType: this.state.runType,
                });

              const evalId = createEvalIfNotExists({
                db: this.opts.db,
                filepath: event.initialResult.filepath,
                name: event.initialResult.evalName,
                runId,
                variantName: event.initialResult.variantName,
                variantGroup: event.initialResult.variantGroup,
              });

              if (!this.evalStartTimes.has(evalId)) {
                this.evalStartTimes.set(
                  evalId,
                  event.emittedAt ?? performance.now()
                );
              }

              const resultId = insertResult({
                db: this.opts.db,
                evalId,
                order: event.initialResult.order,
                input: "",
                expected: "",
                output: null,
                duration: 0,
                status: "running",
                renderedColumns: [],
              });

              this.updateState({
                ...this.state,
                evalNamesRunning: [
                  ...this.state.evalNamesRunning,
                  event.initialResult.evalName,
                ],
                resultIdsRunning: [...this.state.resultIdsRunning, resultId],
                runId,
              });
            }

            break;
          case "RESULT_SUBMITTED":
            {
              // Store result in memory for reporting
              const resultKey = `${event.result.filepath}:${event.result.evalName}:${event.result.order}`;
              this.collectedResults.set(resultKey, event.result);

              const runId =
                this.state.runId ??
                createRun({
                  db: this.opts.db,
                  runType: this.state.runType,
                });

              const evalId = createEvalIfNotExists({
                db: this.opts.db,
                filepath: event.result.filepath,
                name: event.result.evalName,
                runId,
                variantName: event.result.variantName,
                variantGroup: event.result.variantGroup,
              });

              const completionTimestamp = event.emittedAt ?? performance.now();

              let existingResultId: number | bigint | undefined =
                findResultByEvalIdAndOrder({
                  db: this.opts.db,
                  evalId,
                  order: event.result.order,
                });

              if (existingResultId) {
                updateResult({
                  db: this.opts.db,
                  resultId: existingResultId,
                  output: event.result.output,
                  duration: event.result.duration,
                  status: event.result.status,
                  renderedColumns: event.result.renderedColumns,
                  input: event.result.input,
                  expected: event.result.expected,
                });
              } else {
                existingResultId = insertResult({
                  db: this.opts.db,
                  evalId,
                  order: event.result.order,
                  input: event.result.input,
                  expected: event.result.expected,
                  output: event.result.output,
                  duration: event.result.duration,
                  status: event.result.status,
                  renderedColumns: event.result.renderedColumns,
                });
              }

              for (const score of event.result.scores) {
                insertScore({
                  db: this.opts.db,
                  resultId: existingResultId,
                  description: score.description,
                  name: score.name,
                  score: score.score ?? 0,
                  metadata: score.metadata,
                });
              }

              let traceOrder = 0;
              for (const trace of event.result.traces) {
                traceOrder++;
                insertTrace({
                  db: this.opts.db,
                  resultId: existingResultId,
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

              const allResults = getAllResultsForEval({
                db: this.opts.db,
                evalId,
              });

              const resultIdsRunning = this.state.resultIdsRunning.filter(
                (id) => id !== existingResultId
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
                const evalStatus = allResults.some((r) => r.status === "fail")
                  ? "fail"
                  : "success";
                const startTime = this.evalStartTimes.get(evalId);
                const measuredDuration =
                  startTime !== undefined
                    ? Math.max(
                        0,
                        Math.round(completionTimestamp - startTime)
                      )
                    : undefined;

                updateEvalStatusAndDuration({
                  db: this.opts.db,
                  evalId,
                  status: evalStatus,
                  duration: measuredDuration,
                });

                this.evalStartTimes.delete(evalId);
              }

              this.updateState({
                ...this.state,
                evalNamesRunning: isEvalComplete
                  ? this.state.evalNamesRunning.filter(
                      (name) => name !== event.result.evalName
                    )
                  : this.state.evalNamesRunning,
                resultIdsRunning,
                runId,
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
            this.evalStartTimes.clear();

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

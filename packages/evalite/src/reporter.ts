import { type Evalite } from "@evalite/core";
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
} from "@evalite/core/db";
import { isEvaliteFile } from "@evalite/core/utils";
import type { Custom } from "@vitest/runner";
import { getTests, hasFailed } from "@vitest/runner/utils";
import { table } from "table";
import c from "tinyrainbow";
import { inspect } from "util";
import type { RunnerTask, RunnerTestFile, TaskResultPack, Test } from "vitest";
import { BasicReporter } from "vitest/reporters";
import { average } from "./utils.js";

export interface EvaliteReporterOptions {
  isWatching: boolean;
  port: number;
  logNewState: (event: Evalite.ServerState) => void;
  db: SQLiteDatabase;
  scoreThreshold: number | undefined;
  modifyExitCode: (exitCode: number) => void;
}

const BADGE_PADDING = "       ";

export function withLabel(
  color: "red" | "green" | "blue" | "cyan",
  label: string,
  message: string
) {
  return `${c.bold(c.inverse(c[color](` ${label} `)))} ${c[color](message)}`;
}

const renderers = {
  title: () => {
    return c.magenta(c.bold("EVALITE"));
  },
  description: (opts: EvaliteReporterOptions) => {
    if (opts.isWatching) {
      return [
        c.dim("running on "),
        c.cyan(`http://localhost:${c.bold(opts.port)}/`),
      ].join("");
    }

    return c.dim("running...");
  },
};

type ReporterEvent =
  | {
      type: "RUN_BEGUN";
      filepaths: string[];
      runType: Evalite.RunType;
    }
  | {
      type: "RUN_ENDED";
    }
  | {
      type: "RESULT_SUBMITTED";
      result: Evalite.Result;
    }
  | {
      type: "RESULT_STARTED";
      initialResult: Evalite.InitialResult;
    };

export default class EvaliteReporter extends BasicReporter {
  private opts: EvaliteReporterOptions;
  private state: Evalite.ServerState = { type: "idle" };
  private didLastRunFailThreshold: "yes" | "no" | "unknown" = "unknown";

  // private server: Server;
  constructor(opts: EvaliteReporterOptions) {
    super();
    this.opts = opts;
  }
  override onInit(ctx: any): void {
    this.ctx = ctx;
    this.start = performance.now();

    this.ctx.logger.log("");
    this.ctx.logger.log(
      ` ${renderers.title()} ${renderers.description(this.opts)}`
    );
    this.ctx.logger.log("");

    this.sendEvent({
      type: "RUN_BEGUN",
      filepaths: this.ctx.state.getFiles().map((f) => f.filepath),
      runType: "full",
    });
  }

  override onWatcherStart(
    files: RunnerTestFile[] = [],
    errors: unknown[] = []
  ): void {
    this.log();

    const failedDueToError = (errors?.length ?? 0) > 0 || hasFailed(files);

    const failedDueToThreshold = this.didLastRunFailThreshold === "yes";

    if (failedDueToError) {
      this.log(
        withLabel(
          "red",
          "FAIL",
          "Errors detected in evals. Watching for file changes..."
        )
      );
    } else if (failedDueToThreshold) {
      this.log(
        withLabel(
          "red",
          "FAIL",
          `${this.opts.scoreThreshold}% threshold not met. Watching for file changes...`
        )
      );
    } else {
      this.log(withLabel("green", "PASS", "Waiting for file changes..."));
    }

    const hints = [
      c.dim("press ") + c.bold("h") + c.dim(" to show help"),
      c.dim("press ") + c.bold("q") + c.dim(" to quit"),
    ];

    this.log(BADGE_PADDING + hints.join(c.dim(", ")));
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
              });

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
              });

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
                  promptTokens: trace.usage?.promptTokens,
                  completionTokens: trace.usage?.completionTokens,
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
                updateEvalStatusAndDuration({
                  db: this.opts.db,
                  evalId,
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

  override onWatcherRerun(files: string[], trigger?: string): void {
    this.sendEvent({
      type: "RUN_BEGUN",
      filepaths: files,
      runType: "partial",
    });
    super.onWatcherRerun(files, trigger);
  }

  override onFinished = async (
    files = this.ctx.state.getFiles(),
    errors = this.ctx.state.getUnhandledErrors()
  ) => {
    this.sendEvent({
      type: "RUN_ENDED",
    });

    super.onFinished(files, errors);
  };

  protected override printTask(file: RunnerTask): void {
    // Tasks can be files or individual tests, and
    // this ensures we only print files
    if (
      !("filepath" in file) ||
      !file.result?.state ||
      file.result?.state === "run"
    ) {
      return;
    }

    const tests = getTests(file);

    const hasNoEvalite = tests.every((t) => !t.meta.evalite);

    if (hasNoEvalite) {
      return super.printTask(file);
    }

    const scores: number[] = [];

    const failed = tests.some((t) => t.result?.state === "fail");

    for (const { meta } of tests) {
      if (meta.evalite?.result) {
        scores.push(...meta.evalite!.result.scores.map((s) => s.score ?? 0));
      }
    }

    const totalScore = scores.reduce((a, b) => a + b, 0);
    const averageScore = totalScore / scores.length;

    const title = failed ? c.red("✖") : displayScore(averageScore);

    const toLog = [
      ` ${title} `,
      `${file.name}  `,
      c.dim(
        `(${file.tasks.length} ${file.tasks.length > 1 ? "evals" : "eval"})`
      ),
    ];

    // if (task.result.duration) {
    //   toLog.push(" " + c.dim(`${Math.round(task.result.duration ?? 0)}ms`));
    // }

    this.ctx.logger.log(toLog.join(""));
  }

  override reportTestSummary(files: RunnerTestFile[], errors: unknown[]): void {
    /**
     * These tasks are the actual tests that were run
     */
    const tests = getTests(files);

    const collectTime = files.reduce((a, b) => a + (b.collectDuration || 0), 0);
    const testsTime = files.reduce((a, b) => a + (b.result?.duration || 0), 0);
    const setupTime = files.reduce((a, b) => a + (b.setupDuration || 0), 0);

    const totalDuration = collectTime + testsTime + setupTime;

    const failedTasks = files.filter((file) => {
      return file.tasks.some((task) => task.result?.state === "fail");
    });

    const averageScore = getScoreFromTests(tests);

    const scoreDisplay =
      failedTasks.length > 0
        ? c.red("✖ ") + c.dim(`(${failedTasks.length} failed)`)
        : displayScore(averageScore);

    this.ctx.logger.log(
      ["      ", c.dim("Score"), "  ", scoreDisplay].join("")
    );

    if (typeof this.opts.scoreThreshold === "number") {
      let thresholdScoreSuffix = "";

      if (averageScore * 100 < this.opts.scoreThreshold) {
        thresholdScoreSuffix = `${c.dim(` (failed)`)}`;
        this.opts.modifyExitCode(1);
        this.didLastRunFailThreshold = "yes";
      } else {
        thresholdScoreSuffix = `${c.dim(` (passed)`)}`;
        this.opts.modifyExitCode(0);
        this.didLastRunFailThreshold = "no";
      }

      this.ctx.logger.log(
        [
          "  ",
          c.dim("Threshold"),
          "  ",
          c.bold(this.opts.scoreThreshold + "%"),
          thresholdScoreSuffix,
        ].join("")
      );
    }

    this.ctx.logger.log(
      [" ", c.dim("Eval Files"), "  ", files.length].join("")
    );

    this.ctx.logger.log(
      [
        "      ",
        c.dim("Evals"),
        "  ",
        files.reduce((a, b) => a + b.tasks.length, 0),
      ].join("")
    );

    this.ctx.logger.log(
      ["   ", c.dim("Duration"), "  ", `${Math.round(totalDuration)}ms`].join(
        ""
      )
    );

    const totalFiles = new Set(files.map((f) => f.filepath)).size;

    if (totalFiles === 1 && failedTasks.length === 0) {
      this.renderTable(
        tests
          .filter((t) => typeof t.meta.evalite?.result === "object")
          .map((t) => t.meta.evalite!.result!)
          .map((result) => ({
            columns:
              result.renderedColumns.length > 0
                ? result.renderedColumns.map((col) => ({
                    label: col.label,
                    value: renderMaybeEvaliteFile(col.value),
                  }))
                : [
                    {
                      label: "Input",
                      value: renderMaybeEvaliteFile(result.input),
                    },
                    // ...(result.expected
                    //   ? [
                    //       {
                    //         label: "Expected",
                    //         value: result.expected,
                    //       },
                    //     ]
                    //   : []),
                    {
                      label: "Output",
                      value: renderMaybeEvaliteFile(result.output),
                    },
                  ],
            score: average(result.scores, (s) => s.score ?? 0),
          }))
      );
    }
  }

  private renderTable(
    rows: {
      columns: {
        label: string;
        value: unknown;
      }[];
      score: number;
    }[]
  ) {
    this.ctx.logger.log("");

    const availableColumns = process.stdout.columns || 80;

    const scoreWidth = 5;
    const columnsWritableWidth = 11;
    const availableInnerSpace =
      availableColumns - columnsWritableWidth - scoreWidth;

    const columns = rows[0]?.columns;

    if (!columns) {
      return;
    }

    const colWidth = Math.min(
      Math.floor(availableInnerSpace / columns.length),
      80
    );

    this.ctx.logger.log(
      table(
        [
          [
            ...columns.map((col) => c.cyan(c.bold(col.label))),
            c.cyan(c.bold("Score")),
          ],
          ...rows.map((row) => [
            ...row.columns.map((col) => {
              return typeof col.value === "object"
                ? inspect(col.value, {
                    colors: true,
                    depth: null,
                    breakLength: colWidth,
                    numericSeparator: true,
                    compact: true,
                  })
                : col.value;
            }),
            displayScore(row.score),
          ]),
        ],
        {
          columns: [
            ...columns.map((col) => ({
              width: colWidth,
              wrapWord: typeof col.value === "string",
            })),
            { width: scoreWidth },
          ],
        }
      )
    );
  }

  onTestStart(test: Test) {
    if (!test.meta.evalite?.initialResult) {
      throw new Error("No initial result present");
    }

    this.sendEvent({
      type: "RESULT_STARTED",
      initialResult: test.meta.evalite.initialResult,
    });
  }
  onTestFinished(test: Test) {
    if (!test.suite) {
      throw new Error("No suite present");
    }

    if (!test.meta.evalite?.result) {
      throw new Error("No result present");
    }

    this.sendEvent({
      type: "RESULT_SUBMITTED",
      result: test.meta.evalite.result,
    });
  }

  onTestFilePrepare(file: RunnerTestFile) {}
  onTestFileFinished(file: RunnerTestFile) {}

  // Taken from https://github.com/vitest-dev/vitest/blob/4e60333dc7235704f96314c34ca510e3901fe61f/packages/vitest/src/node/reporters/task-parser.ts
  override onTaskUpdate(packs: TaskResultPack[]) {
    const startingTests: Test[] = [];
    const finishedTests: Test[] = [];

    for (const pack of packs) {
      const task = this.ctx.state.idMap.get(pack[0]);

      if (task?.type === "test") {
        if (task.result?.state === "run") {
          startingTests.push(task);
        } else if (task.result?.hooks?.afterEach !== "run") {
          finishedTests.push(task);
        }
      }
    }

    finishedTests.forEach((test) => this.onTestFinished(test));

    startingTests.forEach((test) => this.onTestStart(test));

    super.onTaskUpdate(packs);
  }
}

const displayScore = (_score: number) => {
  const score = Number.isNaN(_score) ? 0 : _score;
  const percentageScore = Math.round(score * 100);
  if (percentageScore >= 80) {
    return c.bold(c.green(percentageScore + "%"));
  } else if (percentageScore >= 50) {
    return c.bold(c.yellow(percentageScore + "%"));
  } else {
    return c.bold(c.red(percentageScore + "%"));
  }
};

const renderMaybeEvaliteFile = (input: unknown) => {
  if (isEvaliteFile(input)) {
    return input.path;
  }

  return input;
};

const getScoreFromTests = (tests: (Test | Custom)[]) => {
  const scores = tests.flatMap(
    (test) => test.meta.evalite?.result?.scores.map((s) => s.score ?? 0) || []
  );

  const averageScore = average(scores, (score) => score ?? 0);

  return averageScore;
};

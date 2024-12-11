import { type Evalite } from "@evalite/core";
import { saveRun, type SQLiteDatabase } from "@evalite/core/db";
import { getTests } from "@vitest/runner/utils";
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

const createEvalIfNotExists = (
  db: SQLiteDatabase,
  opts: {
    runId: number | bigint;
    name: string;
    filepath: string;
  }
): number | bigint => {
  let evaluationId: number | bigint | undefined = db
    .prepare<{ name: string; runId: number | bigint }, { id: number }>(
      `
        SELECT id
        FROM evals
        WHERE name = @name AND run_id = @runId
      `
    )
    .get({ name: opts.name, runId: opts.runId })?.id;

  if (!evaluationId) {
    evaluationId = db
      .prepare<{}, { id: number }>(
        `
          INSERT INTO evals (run_id, name, filepath, duration)
          VALUES (@runId, @name, @filepath, @duration)
        `
      )
      .run({
        runId: opts.runId,
        name: opts.name,
        filepath: opts.filepath,
        duration: 0,
      }).lastInsertRowid;
  }

  return evaluationId;
};

export default class EvaliteReporter extends BasicReporter {
  private opts: EvaliteReporterOptions;
  private lastRunTypeLogged: Evalite.RunType = "full";
  private state: Evalite.ServerState = { type: "idle" };

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
    this.lastRunTypeLogged = "full";
  }

  override onWatcherStart(files?: RunnerTestFile[], errors?: unknown[]): void {
    super.onWatcherStart(files, errors);
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
              const evalId = createEvalIfNotExists(this.opts.db, {
                filepath: event.initialResult.filepath,
                name: event.initialResult.evalName,
                runId: this.state.runId,
              });

              const resultId = this.opts.db
                .prepare<{}, { id: number }>(
                  `
                  INSERT INTO results (eval_id, col_order, input, expected, duration, output)
                  VALUES (@eval_id, @col_order, @input, @expected, @duration, @output)
                `
                )
                .run({
                  eval_id: evalId,
                  col_order: event.initialResult.order,
                  input: JSON.stringify(event.initialResult.input),
                  expected: JSON.stringify(event.initialResult.expected),
                  output: JSON.stringify(null),
                  duration: 0,
                }).lastInsertRowid;

              this.updateState({
                ...this.state,
                evalNamesRunning: [
                  ...this.state.evalNamesRunning,
                  event.initialResult.evalName,
                ],
                resultIdsRunning: [...this.state.resultIdsRunning, resultId],
              });
            }

            break;
          case "RESULT_SUBMITTED":
            {
              const evalId = createEvalIfNotExists(this.opts.db, {
                filepath: event.result.filepath,
                name: event.result.evalName,
                runId: this.state.runId,
              });

              let existingResultId: number | bigint | undefined = this.opts.db
                .prepare<{}, { id: number }>(
                  `
                  SELECT id
                  FROM results
                  WHERE eval_id = @eval_id AND col_order = @col_order
                `
                )
                .get({
                  eval_id: evalId,
                  col_order: event.result.order,
                })?.id;

              if (existingResultId) {
                // Update existing record with new info
                this.opts.db
                  .prepare<{}, { id: number }>(
                    `
                    UPDATE results
                    SET output = @output, duration = @duration
                    WHERE id = @id
                  `
                  )
                  .run({
                    id: existingResultId,
                    output: JSON.stringify(event.result.output),
                    duration: event.result.duration,
                  });
              } else {
                // Create new record
                existingResultId = this.opts.db
                  .prepare<{}, { id: number }>(
                    `
                    INSERT INTO results (eval_id, col_order, input, expected, output, duration)
                    VALUES (@eval_id, @col_order, @input, @expected, @output, @duration)
                  `
                  )
                  .run({
                    eval_id: evalId,
                    col_order: event.result.order,
                    input: JSON.stringify(event.result.input),
                    expected: JSON.stringify(event.result.expected),
                    output: JSON.stringify(event.result.output),
                    duration: event.result.duration,
                  })!.lastInsertRowid;
              }

              // Save the scores
              for (const score of event.result.scores) {
                this.opts.db
                  .prepare<
                    {
                      result_id: number | bigint;
                      description: string | undefined;
                      name: string;
                      score: number;
                      metadata: string;
                    },
                    { id: number }
                  >(
                    `
                    INSERT INTO scores (result_id, name, score, metadata, description)
                    VALUES (@result_id, @name, @score, @metadata, @description)
                  `
                  )
                  .run({
                    result_id: existingResultId,
                    description: score.description,
                    name: score.name,
                    score: score.score ?? 0,
                    metadata: JSON.stringify(score.metadata),
                  });
              }
              // Save the traces
              let traceOrder = 0;
              for (const trace of event.result.traces) {
                traceOrder++;
                this.opts.db
                  .prepare<{}, { id: number }>(
                    `
                    INSERT INTO traces (result_id, input, output, start_time, end_time, prompt_tokens, completion_tokens, col_order)
                    VALUES (@result_id, @input, @output, @start_time, @end_time, @prompt_tokens, @completion_tokens, @col_order)
                  `
                  )
                  .run({
                    result_id: existingResultId,
                    input: JSON.stringify(trace.input),
                    output: JSON.stringify(trace.output),
                    start_time: Math.round(trace.start),
                    end_time: Math.round(trace.end),
                    prompt_tokens: trace.usage?.promptTokens,
                    completion_tokens: trace.usage?.completionTokens,
                    col_order: traceOrder,
                  });
              }

              const allResults = this.opts.db
                .prepare<{ eval_id: number | bigint }, { id: number }>(
                  `
                  SELECT id
                  FROM results
                  WHERE eval_id = @eval_id
                `
                )
                .all({ eval_id: evalId });

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

              this.updateState({
                ...this.state,
                evalNamesRunning: isEvalComplete
                  ? this.state.evalNamesRunning.filter(
                      (name) => name !== event.result.evalName
                    )
                  : this.state.evalNamesRunning,
                resultIdsRunning,
              });
            }

            break;
          default:
            throw new Error(`${event.type} not allowed in ${this.state.type}`);
        }
      case "idle": {
        switch (event.type) {
          case "RUN_BEGUN":
            const runId = this.opts.db
              .prepare<{}, { runType: Evalite.RunType }>(
                `
                  INSERT INTO runs (runType)
                  VALUES (@runType)
                `
              )
              .run({ runType: event.runType }).lastInsertRowid;

            this.updateState({
              filepaths: event.filepaths,
              runType: event.runType,
              type: "running",
              runId,
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
    this.lastRunTypeLogged = "partial";
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

    const scores = tests.flatMap((test) =>
      test.meta.evalite?.result?.scores.map((s) => s.score ?? 0)
    );

    const averageScore = average(scores, (score) => score ?? 0);

    const collectTime = files.reduce((a, b) => a + (b.collectDuration || 0), 0);
    const testsTime = files.reduce((a, b) => a + (b.result?.duration || 0), 0);
    const setupTime = files.reduce((a, b) => a + (b.setupDuration || 0), 0);

    const totalDuration = collectTime + testsTime + setupTime;

    const failedTasks = files.filter((file) => {
      return file.tasks.some((task) => task.result?.state === "fail");
    });

    const scoreDisplay =
      failedTasks.length > 0
        ? c.red("✖ ") + c.dim(`(${failedTasks.length} failed)`)
        : displayScore(averageScore);

    this.ctx.logger.log(
      ["      ", c.dim("Score"), "  ", scoreDisplay].join("")
    );

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
            input: result.input,
            output: result.output,
            score: average(result.scores, (s) => s.score ?? 0),
          }))
      );
    }
  }

  private renderTable(
    props: {
      input: unknown;
      output: unknown;
      score: number;
    }[]
  ) {
    this.ctx.logger.log("");

    const availableColumns = process.stdout.columns || 80;

    const scoreWidth = 5;
    const columnsWritableWidth = 11;
    const availableInnerSpace =
      availableColumns - columnsWritableWidth - scoreWidth;

    const colWidth = Math.min(Math.floor(availableInnerSpace / 2), 80);

    this.ctx.logger.log(
      table(
        [
          [
            c.cyan(c.bold("Input")),
            c.cyan(c.bold("Output")),
            c.cyan(c.bold("Score")),
          ],
          ...props.map((p) => [
            typeof p.input === "object"
              ? inspect(p.input, {
                  colors: true,
                  depth: null,
                  breakLength: colWidth,
                  numericSeparator: true,
                  compact: true,
                })
              : p.input,
            typeof p.output === "object"
              ? inspect(p.output, {
                  colors: true,
                  depth: null,
                  breakLength: colWidth,
                  numericSeparator: true,
                  compact: true,
                })
              : p.output,
            displayScore(p.score),
          ]),
        ],
        {
          columns: [
            { width: colWidth, wrapWord: typeof props[0]?.input === "string" },
            { width: colWidth, wrapWord: typeof props[0]?.output === "string" },
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

  override onTaskUpdate(packs: TaskResultPack[]) {
    const startingTestFiles: RunnerTestFile[] = [];
    const finishedTestFiles: RunnerTestFile[] = [];

    const startingTests: Test[] = [];
    const finishedTests: Test[] = [];

    for (const pack of packs) {
      const task = this.ctx.state.idMap.get(pack[0]);

      if (task?.type === "suite" && "filepath" in task && task.result?.state) {
        if (task?.result?.state === "run") {
          startingTestFiles.push(task);
        }
      }

      if (task?.type === "test") {
        if (task.result?.state === "run") {
          startingTests.push(task);
        } else if (task.result?.hooks?.afterEach !== "run") {
          finishedTests.push(task);
        }
      }
    }

    finishedTests.forEach((test) => this.onTestFinished(test));
    finishedTestFiles.forEach((file) => this.onTestFileFinished(file));

    startingTestFiles.forEach((file) => this.onTestFilePrepare(file));
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

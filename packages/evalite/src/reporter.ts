import type { SQLiteDatabase } from "./db.js";
import { hasFailed } from "@vitest/runner/utils";
import type { RunnerTask, RunnerTestFile, TaskResultPack, Test } from "vitest";
import { BasicReporter } from "vitest/reporters";
import type { Evalite } from "./types.js";
import { EvaliteRunner } from "./reporter/EvaliteRunner.js";
import {
  computeTestSummaryData,
  renderDetailedTable,
  renderInitMessage,
  renderScoreDisplay,
  renderSummaryStats,
  renderTask,
  renderThreshold,
  renderWatcherStart,
  type TaskNode,
} from "./reporter/rendering.js";

export interface EvaliteReporterOptions {
  isWatching: boolean;
  port: number;
  logNewState: (event: Evalite.ServerState) => void;
  db: SQLiteDatabase;
  scoreThreshold: number | undefined;
  modifyExitCode: (exitCode: number) => void;
}

export default class EvaliteReporter extends BasicReporter {
  private opts: EvaliteReporterOptions;
  private runner: EvaliteRunner;

  constructor(opts: EvaliteReporterOptions) {
    super();
    this.opts = opts;
    this.runner = new EvaliteRunner({
      db: opts.db,
      logNewState: opts.logNewState,
      modifyExitCode: opts.modifyExitCode,
      scoreThreshold: opts.scoreThreshold,
    });
  }
  override onInit(ctx: any): void {
    this.ctx = ctx;
    this.start = performance.now();

    renderInitMessage(this.ctx.logger, {
      isWatching: this.opts.isWatching,
      port: this.opts.port,
    });

    this.runner.sendEvent({
      type: "RUN_BEGUN",
      filepaths: this.ctx.state.getFiles().map((f) => f.filepath),
      runType: "full",
    });
  }

  override onWatcherStart(
    files: RunnerTestFile[] = [],
    errors: unknown[] = []
  ): void {
    const hasErrors = (errors?.length ?? 0) > 0 || hasFailed(files);
    const failedDueToThreshold =
      this.runner.getDidLastRunFailThreshold() === "yes";

    renderWatcherStart(this.ctx.logger, {
      hasErrors,
      failedDueToThreshold,
      scoreThreshold: this.opts.scoreThreshold,
    });
  }

  override onWatcherRerun(files: string[], trigger?: string): void {
    this.runner.sendEvent({
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
    this.runner.sendEvent({
      type: "RUN_ENDED",
    });

    super.onFinished(files, errors);
  };

  protected override printTask(file: RunnerTask): void {
    const wasRendered = renderTask(this.ctx.logger, file as TaskNode);
    if (!wasRendered) {
      super.printTask(file);
    }
  }

  override reportTestSummary(files: RunnerTestFile[]): void {
    const data = computeTestSummaryData(files as TaskNode[]);

    this.runner.handleTestSummary({
      failedTasksCount: data.failedTasks.length,
      averageScore: data.averageScore,
    });

    renderScoreDisplay(
      this.ctx.logger,
      data.failedTasks.length,
      data.averageScore
    );

    if (typeof this.opts.scoreThreshold === "number") {
      renderThreshold(
        this.ctx.logger,
        this.opts.scoreThreshold,
        data.averageScore
      );
    }

    renderSummaryStats(this.ctx.logger, data);

    if (data.totalFiles === 1 && data.failedTasks.length === 0) {
      renderDetailedTable(this.ctx.logger, data.tests);
    }
  }

  onTestStart(test: Test) {
    if (!test.meta.evalite?.initialResult) {
      throw new Error("No initial result present");
    }

    this.runner.sendEvent({
      type: "RESULT_STARTED",
      initialResult: test.meta.evalite.initialResult,
    });
  }

  onTestFinished(test: Test) {
    if (!test.suite) {
      throw new Error("No suite present");
    }

    if (test.meta.evalite?.result) {
      this.runner.sendEvent({
        type: "RESULT_SUBMITTED",
        result: test.meta.evalite.result,
      });

      return;
    }

    if (!test.meta.evalite?.resultAfterFilesSaved) {
      throw new Error("No usable result present");
    }

    // At this point, the test has finished
    // but not reported a result. We should
    // indicate that the test has failed
    this.runner.sendEvent({
      type: "RESULT_SUBMITTED",
      result: {
        ...test.meta.evalite.resultAfterFilesSaved,
        status: "fail",
        output: null,
        duration: 0,
        scores: [],
        traces: [],
        renderedColumns: [],
      },
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

    super.onTaskUpdate?.(packs);
  }
}

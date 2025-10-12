import { getTests, hasFailed } from "@vitest/runner/utils";
import type { RunnerTestFile } from "vitest";
import type {
  Reporter,
  TestCase,
  TestModule,
  TestModuleState,
  TestSuite,
  Vitest,
} from "vitest/node.js";
import { BasicReporter, DefaultReporter } from "vitest/reporters";
import type { SQLiteDatabase } from "./db.js";
import { EvaliteRunner } from "./reporter/EvaliteRunner.js";
import {
  renderDetailedTable,
  renderInitMessage,
  renderScoreDisplay,
  renderServeModeFinalMessage,
  renderSummaryStats,
  renderTask,
  renderThreshold,
  renderWatcherStart,
} from "./reporter/rendering.js";
import type { Evalite } from "./types.js";
import { average, max } from "./utils.js";
import path from "node:path";

export interface EvaliteReporterOptions {
  isWatching: boolean;
  port: number;
  logNewState: (event: Evalite.ServerState) => void;
  db: SQLiteDatabase;
  scoreThreshold: number | undefined;
  modifyExitCode: (exitCode: number) => void;
  mode: "watch-for-file-changes" | "run-once-and-exit" | "run-once-and-serve";
}

export default class EvaliteReporter
  extends DefaultReporter
  implements Reporter
{
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
  override onInit(ctx: Vitest): void {
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

    super.onInit(ctx);
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

  override reportTestSummary(files: RunnerTestFile[]): void {
    const tests = getTests(files);

    const failedTestsCount = tests.filter(
      (test) => test.result?.state === "fail"
    ).length;

    const scores = tests.flatMap((test) => {
      const scores = test.meta.evalite?.result?.scores;

      return scores ?? [];
    });

    const averageScore =
      scores.length === 0 ? null : average(scores, (score) => score.score ?? 0);

    this.runner.handleTestSummary({
      failedTasksCount: failedTestsCount,
      averageScore,
    });

    this.ctx.logger.log("");

    renderScoreDisplay(this.ctx.logger, failedTestsCount, averageScore);

    if (typeof this.opts.scoreThreshold === "number") {
      renderThreshold(this.ctx.logger, this.opts.scoreThreshold, averageScore);
    }

    renderSummaryStats(this.ctx.logger, {
      totalFiles: files.length,
      maxDuration: max(tests, (test) => test.result?.duration ?? 0),
      totalEvals: tests.length,
    });

    if (files.length === 1 && failedTestsCount === 0) {
      renderDetailedTable(
        this.ctx.logger,
        tests
          .map((test) => {
            return test.meta.evalite?.result;
          })
          .filter((result) => result !== undefined)
      );
    }

    if (this.opts.mode === "run-once-and-serve") {
      renderServeModeFinalMessage(this.ctx.logger, this.opts.port);
    }
  }

  onTestSuiteReady(testSuite: TestSuite): void {
    return;
  }

  override onTestSuiteResult(testSuite: TestSuite): void {
    return;
  }

  override onTestCaseReady(testCase: TestCase) {
    const meta = testCase.meta();
    if (!meta.evalite?.initialResult) {
      throw new Error("No initial result present");
    }

    this.runner.sendEvent({
      type: "RESULT_STARTED",
      initialResult: meta.evalite.initialResult,
    });
  }

  override onTestModuleQueued(file: TestModule): void {
    return;
  }

  onTestModuleStart(mod: TestModule): void {
    const tests = Array.from(mod.children.allTests());

    renderTask({
      logger: this.ctx.logger,
      result: {
        filePath: path.relative(this.ctx.config.root, mod.moduleId),
        status: "running",
        scores: [],
        numberOfEvals: tests.length,
      },
    });
    return;
  }

  override onTestModuleCollected(module: TestModule): void {
    return;
  }

  override onTestModuleEnd(mod: TestModule): void {
    const tests = Array.from(mod.children.allTests());

    const hasFailed = tests.some((test) => test.result()?.state === "failed");

    const scores = tests.flatMap(
      (test) => test.meta().evalite?.result?.scores || []
    );

    renderTask({
      logger: this.ctx.logger,
      result: {
        filePath: path.relative(this.ctx.config.root, mod.moduleId),
        status: hasFailed ? "fail" : "success",
        numberOfEvals: tests.length,
        scores,
      },
    });
  }

  override onTestCaseResult(testCase: TestCase) {
    const meta = testCase.meta();

    if (meta.evalite?.result) {
      this.runner.sendEvent({
        type: "RESULT_SUBMITTED",
        result: meta.evalite.result,
      });

      return;
    }

    if (!meta.evalite?.resultAfterFilesSaved) {
      throw new Error("No usable result present");
    }

    // At this point, the test has finished
    // but not reported a result. We should
    // indicate that the test has failed

    const result: Evalite.Result = {
      ...meta.evalite.resultAfterFilesSaved,
      status: "fail",
      output: null,
      duration: 0,
      scores: [],
      traces: [],
      renderedColumns: [],
    };

    this.runner.sendEvent({
      type: "RESULT_SUBMITTED",
      result: result,
    });
  }
}

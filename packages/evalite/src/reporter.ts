import { getTests, hasFailed } from "@vitest/runner/utils";
import type { RunnerTestFile, TestAnnotation } from "vitest";
import type {
  Reporter,
  TestCase,
  TestModule,
  TestModuleState,
  TestSuite,
  Vitest,
} from "vitest/node.js";
import { BasicReporter } from "vitest/reporters";
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
import { performance } from "node:perf_hooks";
import { deserializeAnnotation } from "./reporter/events.js";

export interface EvaliteReporterOptions {
  isWatching: boolean;
  port: number;
  logNewState: (event: Evalite.ServerState) => void;
  db: SQLiteDatabase;
  scoreThreshold: number | undefined;
  modifyExitCode: (exitCode: number) => void;
  mode: "watch-for-file-changes" | "run-once-and-exit" | "run-once-and-serve";
  hideTable?: boolean;
}

export default class EvaliteReporter
  extends BasicReporter
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
  }

  override onFinished = async (
    files = this.ctx.state.getFiles(),
    errors = this.ctx.state.getUnhandledErrors()
  ) => {
    this.runner.sendEvent({
      type: "RUN_ENDED",
    });

    // Call reportTestSummary manually since BasicReporter's onFinished doesn't
    this.reportTestSummary(files);
  };

  override reportTestSummary(files: RunnerTestFile[]): void {
    const tests = getTests(files);

    const failedTestsCount = tests.filter(
      (test) => test.result?.state === "fail"
    ).length;

    // Get scores from runner's collected results
    const scores = this.runner.getAllScores();

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

    if (files.length === 1 && !this.opts.hideTable) {
      const successfulResults = this.runner.getSuccessfulResults();

      if (successfulResults.length > 0) {
        renderDetailedTable(
          this.ctx.logger,
          successfulResults,
          failedTestsCount
        );
      }
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

  onTestCaseAnnotate(testCase: TestCase, annotation: TestAnnotation): void {
    const data = deserializeAnnotation(annotation.message);

    if (!data) {
      // Not an evalite annotation - ignore
      return;
    }

    if (data.type === "RESULT_STARTED") {
      this.runner.sendEvent({
        type: "RESULT_STARTED",
        initialResult: data.initialResult,
        emittedAt: data.emittedAt,
      });
    } else if (data.type === "RESULT_SUBMITTED") {
      this.runner.sendEvent({
        type: "RESULT_SUBMITTED",
        result: data.result,
        emittedAt: data.emittedAt,
      });
    }
  }

  onTestModuleQueued(file: TestModule): void {
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

  override onTestCaseResult(test: TestCase): void {
    // Check if we received a RESULT_SUBMITTED annotation
    const hasResultSubmitted = test.annotations().some((annotation) => {
      const data = deserializeAnnotation(annotation.message);
      return data?.type === "RESULT_SUBMITTED";
    });

    // If we already got a RESULT_SUBMITTED, nothing to do
    if (hasResultSubmitted) {
      return;
    }

    // Check if we have a RESULT_STARTED annotation
    const resultStartedAnnotation = test.annotations().find((annotation) => {
      const data = deserializeAnnotation(annotation.message);
      return data?.type === "RESULT_STARTED";
    });

    if (!resultStartedAnnotation) {
      // No evalite annotations at all - not an evalite test
      return;
    }

    // Test finished but never submitted a result - likely timeout
    const data = deserializeAnnotation(resultStartedAnnotation.message);
    if (data && data.type === "RESULT_STARTED") {
      this.runner.sendEvent({
        type: "RESULT_SUBMITTED",
        emittedAt: performance.now(),
        result: {
          evalName: data.initialResult.evalName,
          filepath: data.initialResult.filepath,
          order: data.initialResult.order,
          duration: 0,
          expected: "",
          input: "",
          output: null,
          scores: [],
          traces: [],
          status: "fail",
          renderedColumns: [],
          variantName: data.initialResult.variantName,
          variantGroup: data.initialResult.variantGroup,
        },
      });
    }
  }

  protected override printAnnotations(
    _test: TestCase,
    _console: "log" | "error",
    _padding?: number
  ): void {
    // Evalite uses annotations internally for reporter communication.
    // Users cannot add custom annotations via the Evalite API,
    // so we suppress all annotation output.
    return;
  }

  onTestModuleCollected(module: TestModule): void {
    return;
  }

  override onTestModuleEnd(mod: TestModule): void {
    const tests = Array.from(mod.children.allTests());

    const hasFailed = tests.some((test) => test.result()?.state === "failed");

    const scores = this.runner.getScoresForModule(mod.moduleId);

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
}

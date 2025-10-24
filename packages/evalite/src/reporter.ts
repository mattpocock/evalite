import path from "node:path";
import { getTestName } from "@vitest/runner/utils";
import { parseStacktrace } from "@vitest/utils/source-map";
import c from "tinyrainbow";
import type { RunnerTestFile, TestAnnotation, UserConsoleLog } from "vitest";
import type {
  Reporter,
  RunnerTask,
  SerializedError,
  TestCase,
  TestModule,
  TestRunEndReason,
  TestSuite,
  Vitest,
} from "vitest/node";
import { EvaliteRunner } from "./reporter/EvaliteRunner.js";
import { deserializeAnnotation } from "./reporter/events.js";
import {
  renderDetailedTable,
  renderErrorsSummary,
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

const F_POINTER = "❯";
const separator = c.dim(" > ");

export interface EvaliteReporterOptions {
  isWatching: boolean;
  port: number;
  logNewState: (event: Evalite.ServerState) => void;
  storage: Evalite.Storage;
  scoreThreshold: number | undefined;
  modifyExitCode: (exitCode: number) => void;
  mode: "watch-for-file-changes" | "run-once-and-exit" | "run-once-and-serve";
  hideTable?: boolean;
}

export default class EvaliteReporter implements Reporter {
  private opts: EvaliteReporterOptions;
  private runner: EvaliteRunner;
  private ctx!: Vitest;
  private start!: number;

  constructor(opts: EvaliteReporterOptions) {
    this.opts = opts;
    this.runner = new EvaliteRunner({
      storage: opts.storage,
      logNewState: opts.logNewState,
      modifyExitCode: opts.modifyExitCode,
      scoreThreshold: opts.scoreThreshold,
    });
  }

  /**
   * Manually trigger a rerun of the current tests
   */
  triggerRerun() {
    this.runner.sendEvent({
      type: "RUN_BEGUN",
      filepaths: this.ctx?.state.getFiles().map((f) => f.filepath) || [],
      runType: "partial",
    });
  }
  onInit(ctx: Vitest): void {
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

  onWatcherStart(files: RunnerTestFile[] = [], errors: unknown[] = []): void {
    const failedDueToThreshold =
      this.runner.getDidLastRunFailThreshold() === "yes";

    renderWatcherStart(this.ctx.logger, {
      files,
      errors,
      failedDueToThreshold,
      scoreThreshold: this.opts.scoreThreshold,
    });
  }

  private shouldLog(
    log: UserConsoleLog,
    taskState?: "passed" | "failed" | "skipped" | "pending"
  ): boolean {
    if (
      this.ctx.config.silent === true ||
      (this.ctx.config.silent === "passed-only" && taskState !== "failed")
    ) {
      return false;
    }
    if (this.ctx.config.onConsoleLog) {
      const task = log.taskId
        ? this.ctx.state.idMap.get(log.taskId)
        : undefined;
      const entity = task && this.ctx.state.getReportedEntity(task);
      if (
        this.ctx.config.onConsoleLog(log.content, log.type, entity) === false
      ) {
        return false;
      }
    }
    return true;
  }

  private getFullName(task: RunnerTask, sep: string): string {
    if (task === task.file) {
      return task.name;
    }
    let name = task.file.name;
    if (task.location) {
      name += c.dim(`:${task.location.line}:${task.location.column}`);
    }
    name += sep;
    name += getTestName(task, sep);
    return name;
  }

  onUserConsoleLog(
    log: UserConsoleLog,
    taskState?: "passed" | "failed" | "skipped" | "pending"
  ): void {
    if (!this.shouldLog(log, taskState)) {
      return;
    }

    const output =
      log.type === "stdout"
        ? this.ctx.logger.outputStream
        : this.ctx.logger.errorStream;
    const write = (msg: string) => {
      (output as any).write(msg);
    };

    let headerText = "unknown test";
    const task = log.taskId ? this.ctx.state.idMap.get(log.taskId) : undefined;

    if (task) {
      headerText = this.getFullName(task, separator);
    } else if (log.taskId && log.taskId !== "__vitest__unknown_test__") {
      headerText = log.taskId;
    }

    write(c.gray(log.type + c.dim(` | ${headerText}\n`)) + log.content);

    if (log.origin) {
      // browser logs don't have an extra end of line at the end like Node.js does
      if (log.browser) {
        write("\n");
      }

      const project = task
        ? this.ctx.getProjectByName(task.file.projectName || "")
        : this.ctx.getRootProject();

      const stack = log.browser
        ? project.browser?.parseStacktrace(log.origin) || []
        : parseStacktrace(log.origin);

      const highlight =
        task && stack.find((i: any) => i.file === task.file.filepath);

      for (const frame of stack) {
        const color = frame === highlight ? c.cyan : c.gray;
        const relativePath = path.relative(project.config.root, frame.file);
        const positions = [
          frame.method,
          `${relativePath}:${c.dim(`${frame.line}:${frame.column}`)}`,
        ]
          .filter(Boolean)
          .join(" ");
        write(color(` ${c.dim(F_POINTER)} ${positions}\n`));
      }
    }

    write("\n");
  }

  onWatcherRerun(files: string[], trigger?: string): void {
    this.runner.sendEvent({
      type: "RUN_BEGUN",
      filepaths: files,
      runType: "partial",
    });
  }

  onTestRunEnd = async (
    testModules: ReadonlyArray<TestModule>,
    unhandledErrors: ReadonlyArray<SerializedError>,
    reason: TestRunEndReason
  ) => {
    this.runner.sendEvent({
      type: "RUN_ENDED",
    });

    // Wait for all queued events to complete
    await this.runner.waitForCompletion();

    // Print errors first (mimicking DefaultReporter's reportSummary -> printErrorsSummary flow)
    renderErrorsSummary(this.ctx.logger, {
      testModules: testModules,
      errors: unhandledErrors,
    });

    // Then print test summary
    this.customTestSummary(testModules);
  };

  private customTestSummary(modules: readonly TestModule[]): void {
    const tests = modules.flatMap((module) =>
      Array.from(module.children.allTests())
    );

    const failedTestsCount = tests.filter(
      (test) => test.result().state === "failed"
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
      totalFiles: modules.length,
      maxDuration: max(tests, (test) => test.diagnostic()?.duration ?? 0),
      totalEvals: tests.length,
    });

    if (modules.length === 1 && !this.opts.hideTable) {
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

  onTestSuiteResult(testSuite: TestSuite): void {
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
      });
    } else if (data.type === "RESULT_SUBMITTED") {
      this.runner.sendEvent({
        type: "RESULT_SUBMITTED",
        result: data.result,
      });
    }
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

  onTestCaseResult(test: TestCase): void {
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
          trialIndex: data.initialResult.trialIndex,
        },
      });
    }
  }

  protected printAnnotations(
    _test: TestCase,
    _console: "log" | "error",
    _padding?: number
  ): void {
    // Evalite uses annotations internally for reporter communication.
    // Users cannot add custom annotations via the Evalite API,
    // so we suppress all annotation output.
    return;
  }

  onTestModuleEnd(mod: TestModule): void {
    const tests = Array.from(mod.children.allTests());

    const hasFailed = tests.some((test) => test.result().state === "failed");

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

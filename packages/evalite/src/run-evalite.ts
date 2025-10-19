import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Writable } from "stream";
import { createVitest, registerConsoleShortcuts } from "vitest/node";
import { createInMemoryStorage } from "./storage/in-memory.js";
import { computeAverageScores } from "./storage/utils.js";
import { FILES_LOCATION } from "./backend-only-constants.js";
import { DEFAULT_SERVER_PORT } from "./constants.js";
import EvaliteReporter from "./reporter.js";
import { createServer } from "./server.js";
import type { Evalite } from "./types.js";
import { createSqliteStorage } from "./storage/sqlite.js";
import { loadEvaliteConfig } from "./config.js";

declare module "vitest" {
  export interface ProvidedContext {
    cwd: string;
    /**
     * Number of trials to run for each test case.
     * Only primitives can be passed here - don't pass entire config as it contains
     * non-serializable functions (like storage factory).
     */
    trialCount: number | undefined;
  }
}

const exportResultsToJSON = async (opts: {
  storage: Evalite.Storage;
  outputPath: string;
  cwd: string;
}) => {
  const latestFullRunResults = await opts.storage.runs.getMany({
    runType: "full",
    orderBy: "created_at",
    orderDirection: "desc",
    limit: 1,
  });

  const latestFullRun = latestFullRunResults[0];
  if (!latestFullRun) {
    throw new Error("No completed run found to export");
  }

  const allSuites = await opts.storage.suites.getMany({
    runIds: [latestFullRun.id],
    statuses: ["fail", "success"],
  });

  const evals = await opts.storage.evals.getMany({
    suiteIds: allSuites.map((e) => e.id),
  });

  const allScores = await opts.storage.scores.getMany({
    evalIds: evals.map((r) => r.id),
  });

  const allTraces = await opts.storage.traces.getMany({
    evalIds: evals.map((r) => r.id),
  });

  const evalsAverageScores = computeAverageScores(allScores);

  // Group evals by suite and transform to camelCase
  const outputData: Evalite.Exported.Output = {
    run: {
      id: latestFullRun.id,
      runType: latestFullRun.runType,
      createdAt: latestFullRun.created_at,
    },
    suites: allSuites.map((suite) => {
      const evalsForSuite = evals.filter((r) => r.suite_id === suite.id);

      const scoresForEval = allScores.filter((s) =>
        evalsForSuite.some((r) => r.id === s.eval_id)
      );

      const evalAvgScore =
        scoresForEval.length > 0
          ? scoresForEval.reduce((sum: number, s) => sum + s.score, 0) /
            scoresForEval.length
          : 0;

      return {
        id: suite.id,
        name: suite.name,
        filepath: suite.filepath,
        duration: suite.duration,
        status: suite.status,
        variantName: suite.variant_name,
        variantGroup: suite.variant_group,
        createdAt: suite.created_at,
        averageScore: evalAvgScore,
        evals: evalsForSuite.map((_eval) => {
          const _evalAvgScore = evalsAverageScores.find(
            (r) => r.eval_id === _eval.id
          );

          const scoresForEval = allScores.filter((s) => s.eval_id === _eval.id);

          const tracesForEval = allTraces.filter((t) => t.eval_id === _eval.id);

          return {
            id: _eval.id,
            duration: _eval.duration,
            input: _eval.input,
            output: _eval.output,
            expected: _eval.expected,
            status: _eval.status,
            colOrder: _eval.col_order,
            renderedColumns: _eval.rendered_columns,
            createdAt: _eval.created_at,
            averageScore: _evalAvgScore?.average ?? 0,
            scores: scoresForEval.map((score) => ({
              id: score.id,
              name: score.name,
              score: score.score,
              description: score.description,
              metadata: score.metadata,
              createdAt: score.created_at,
            })),
            traces: tracesForEval.map((trace) => ({
              id: trace.id,
              input: trace.input,
              output: trace.output,
              startTime: trace.start_time,
              endTime: trace.end_time,
              inputTokens: trace.input_tokens,
              outputTokens: trace.output_tokens,
              totalTokens: trace.total_tokens,
              colOrder: trace.col_order,
            })),
          };
        }),
      };
    }),
  };

  const absolutePath = path.isAbsolute(opts.outputPath)
    ? opts.outputPath
    : path.join(opts.cwd, opts.outputPath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, JSON.stringify(outputData, null, 2), "utf-8");

  console.log(`\nResults exported to: ${absolutePath}`);
};

/**
 * Run Evalite programmatically via the Node API.
 *
 * This is the official Node API for running evaluations programmatically.
 * It provides full control over eval execution including path filtering,
 * watch mode, score thresholds, and result exporting.
 *
 * @param opts - Configuration options for running evaluations
 * @param opts.path - Optional path filter to run specific eval files (defaults to undefined, which runs all evals)
 * @param opts.cwd - Working directory (defaults to process.cwd())
 * @param opts.testOutputWritable - Optional writable stream for test output
 * @param opts.mode - Execution mode: "watch-for-file-changes", "run-once-and-exit", or "run-once-and-serve"
 * @param opts.scoreThreshold - Optional score threshold (0-100) to fail the process if scores are below
 * @param opts.outputPath - Optional path to write test results in JSON format after completion
 *
 * @example
 * ```typescript
 * import { runEvalite } from "evalite/runner";
 *
 * // Run once and exit - simplified usage
 * await runEvalite({
 *   mode: "run-once-and-exit",
 *   scoreThreshold: 80,
 *   outputPath: "./results.json"
 * });
 *
 * // Watch mode for development
 * await runEvalite({
 *   mode: "watch-for-file-changes"
 * });
 *
 * // Run specific eval file with custom working directory
 * await runEvalite({
 *   path: "tests/my-eval.eval.ts",
 *   cwd: "/path/to/project",
 *   mode: "run-once-and-exit"
 * });
 * ```
 */
export const runEvalite = async (opts: {
  path?: string | undefined;
  cwd?: string | undefined;
  testOutputWritable?: Writable;
  mode: "watch-for-file-changes" | "run-once-and-exit" | "run-once-and-serve";
  scoreThreshold?: number;
  outputPath?: string;
  hideTable?: boolean;
  storage?: Evalite.Storage;
  configDebugMode?: boolean;
  disableServer?: boolean;
}) => {
  const cwd = opts.cwd ?? process.cwd();
  const filesLocation = path.join(cwd, FILES_LOCATION);
  await mkdir(filesLocation, { recursive: true });

  // Load config file if present
  const config = await loadEvaliteConfig(cwd);

  // Merge options: opts (highest priority) > config > defaults
  let storage = opts.storage;

  if (!storage && config?.storage) {
    // Call config storage factory (may be async)
    storage = await config.storage();
  }

  if (!storage) {
    storage = createInMemoryStorage();
  }

  const scoreThreshold = opts.scoreThreshold ?? config?.scoreThreshold;
  const hideTable = opts.hideTable ?? config?.hideTable;
  const serverPort = config?.server?.port ?? DEFAULT_SERVER_PORT;
  const testTimeout = config?.testTimeout;
  const maxConcurrency = config?.maxConcurrency;
  const setupFiles = config?.setupFiles;

  const filters = opts.path ? [opts.path] : undefined;
  process.env.EVALITE_REPORT_TRACES = "true";

  let server: ReturnType<typeof createServer> | undefined = undefined;

  if (
    !opts.disableServer &&
    (opts.mode === "watch-for-file-changes" ||
      opts.mode === "run-once-and-serve")
  ) {
    server = createServer({
      storage: storage,
    });
    server.start(serverPort);
  }

  let exitCode: number | undefined = undefined;

  const vitest = await createVitest(
    "test",
    {
      // Everything passed here cannot be
      // overridden by the user
      root: cwd,
      include: ["**/*.eval.?(m)ts"],
      watch: opts.mode === "watch-for-file-changes",
      reporters: [
        new EvaliteReporter({
          logNewState: (newState) => {
            server?.updateState(newState);
          },
          port: serverPort,
          isWatching:
            opts.mode === "watch-for-file-changes" ||
            opts.mode === "run-once-and-serve",
          storage: storage,
          scoreThreshold: scoreThreshold,
          modifyExitCode: (code) => {
            exitCode = code;
          },
          mode: opts.mode,
          hideTable: hideTable,
        }),
      ],
      mode: "test",
      browser: undefined,
    },
    {
      plugins: [
        {
          name: "evalite-config-plugin",
          // Everything inside this config CAN be overridden by user's vite.config.ts
          // EXCEPT when evalite.config.ts explicitly sets values - those override vite.config.ts

          // When we moved to Vitest v4, I found a strange type error where
          // `config` was not being inferred correctly. In the TS playground,
          // this code works fine, so it may be some kind of package resolution issue.
          // Since this code is fully tested, I feel OK with an 'any' for now.
          config(config: any) {
            config.test ??= {};
            // If evalite.config.ts specifies these values, override user's vite.config.ts
            // Otherwise use vite.config.ts value or fallback to default
            if (testTimeout !== undefined) {
              config.test.testTimeout = testTimeout;
            } else {
              config.test.testTimeout ??= 30_000;
            }

            if (maxConcurrency !== undefined) {
              config.test.maxConcurrency = maxConcurrency;
            }
            // Note: no fallback for maxConcurrency - let Vitest use its own default

            if (setupFiles !== undefined) {
              config.test.setupFiles = setupFiles;
            }
            // Note: no fallback for setupFiles - let Vitest use its own default

            config.test.sequence ??= {};
            config.test.sequence.concurrent ??= true;
          },
          // See comment about any on config() above
          configResolved(config: any) {
            if (opts.configDebugMode) {
              const debugMessage = `[Evalite Config Debug] testTimeout: ${config.test?.testTimeout}, maxConcurrency: ${config.test?.maxConcurrency}\n`;
              if (opts.testOutputWritable) {
                opts.testOutputWritable.write(debugMessage);
              } else {
                process.stdout.write(debugMessage);
              }
            }
          },
        },
      ],
    },
    {
      stdout: opts.testOutputWritable || process.stdout,
      stderr: opts.testOutputWritable || process.stderr,
    }
  );

  vitest.provide("cwd", cwd);
  vitest.provide("trialCount", config?.trialCount);

  await vitest.start(filters);

  const dispose = registerConsoleShortcuts(
    vitest,
    process.stdin,
    process.stdout
  );

  const shouldKeepRunning =
    vitest.shouldKeepServer() || opts.mode === "run-once-and-serve";

  if (!shouldKeepRunning) {
    dispose();
    await vitest.close();

    if (opts.outputPath) {
      await exportResultsToJSON({
        storage,
        outputPath: opts.outputPath,
        cwd,
      });
    }

    if (typeof exitCode === "number") {
      process.exit(exitCode);
    }
  }

  return vitest;
};

/**
 * @deprecated Use `runEvalite` instead. This export will be removed in a future version.
 */
export const runVitest = runEvalite;

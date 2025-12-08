import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { Writable } from "stream";
import { configDefaults } from "vitest/config";
import { createVitest, registerConsoleShortcuts } from "vitest/node";
import getPort from "get-port";
import { FILES_LOCATION } from "./backend-only-constants.js";
import { loadEvaliteConfig } from "./config.js";
import { DEFAULT_SERVER_PORT } from "./constants.js";
import EvaliteReporter from "./reporter.js";
import { createServer } from "./server.js";
import { createInMemoryStorage } from "./storage/in-memory.js";
import { computeAverageScores } from "./storage/utils.js";
import type { Evalite } from "./types.js";
import type { ViteUserConfig } from "vitest/config";

declare module "vitest" {
  export interface ProvidedContext {
    cwd: string;
    /**
     * Number of trials to run for each test case.
     * Only primitives can be passed here - don't pass entire config as it contains
     * non-serializable functions (like storage factory).
     */
    trialCount: number | undefined;
    /**
     * Port number where the evalite server is running.
     * Used by cache and other features that need to communicate with the server.
     */
    serverPort: number;
    /**
     * Whether to log cache operations to the console.
     */
    cacheDebug: boolean;
    /**
     * Whether to enable cache for AI SDK model outputs.
     */
    cacheEnabled: boolean;
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
 * @param opts.mode - Execution mode: "watch-for-file-changes", "run-once-and-exit", "run-once-and-serve", or "run-once"
 * @param opts.scoreThreshold - Optional score threshold (0-100) to fail the process if scores are below
 * @param opts.outputPath - Optional path to write test results in JSON format after completion
 * @param opts.forceRerunTriggers - Optional extra file globs that trigger reruns in watch mode (overrides evalite.config.ts if provided)
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
 * // Watch mode with extra file triggers
 * await runEvalite({
 *   mode: "watch-for-file-changes",
 *   forceRerunTriggers: ["src/**\/*.ts", "prompts/**\/*"]
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
  mode: Evalite.RunMode;
  scoreThreshold?: number;
  outputPath?: string;
  hideTable?: boolean;
  storage?: Evalite.Storage;
  configDebugMode?: boolean;
  disableServer?: boolean;
  cacheEnabled?: boolean;
  cacheDebug?: boolean;
  /**
   * Extra file globs that should trigger reruns in watch mode.
   * Overrides `forceRerunTriggers` from evalite.config.ts if provided.
   */
  forceRerunTriggers?: string[];
}) => {
  const cwd = opts.cwd ?? process.cwd();
  const filesLocation = path.join(cwd, FILES_LOCATION);
  await mkdir(filesLocation, { recursive: true });

  // Load config file if present
  const config = await loadEvaliteConfig(cwd);

  // Validate viteConfig doesn't contain forbidden properties
  if (config?.viteConfig?.test) {
    const forbiddenProps = ["testTimeout", "maxConcurrency", "setupFiles"];
    for (const prop of forbiddenProps) {
      if (prop in config.viteConfig.test) {
        throw new Error(
          `Invalid configuration: '${prop}' must be configured at the root level of evalite.config.ts, not in viteConfig.test. Please move it to the root level.`
        );
      }
    }
  }

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

  // Determine cache enabled: opts > config > default (true)
  const cacheEnabled = opts.cacheEnabled ?? config?.cache ?? true;

  // Merge setupFiles:
  // 1. Always include env-setup-file first to load .env files
  // 2. Add setupFiles from evalite.config.ts
  const setupFiles = ["evalite/env-setup-file", ...(config?.setupFiles || [])];

  // Evalite-level "extra watch files":
  // Node API (opts.forceRerunTriggers) takes precedence over evalite.config.ts.
  // If opts.forceRerunTriggers is defined (even []), it wins.
  const forceRerunTriggers =
    (opts.forceRerunTriggers !== undefined
      ? opts.forceRerunTriggers
      : config?.forceRerunTriggers) ?? configDefaults.forceRerunTriggers;

  const filters = opts.path ? [opts.path] : undefined;
  process.env.EVALITE_REPORT_TRACES = "true";

  let server: ReturnType<typeof createServer> | undefined = undefined;
  let actualServerPort = serverPort;

  if (!opts.disableServer) {
    // Try to get the configured port, or find an available one
    actualServerPort = await getPort({
      port: [serverPort, serverPort + 1, serverPort + 2, serverPort + 3],
    });

    server = createServer({
      storage: storage,
    });

    server.start(actualServerPort);

    if (actualServerPort !== serverPort) {
      console.log(
        `Port ${serverPort} unavailable, using port ${actualServerPort}`
      );
    }
  }

  let exitCode: number | undefined;

  // Merge user's viteConfig with evalite defaults
  const mergedViteConfig: ViteUserConfig = {
    ...config?.viteConfig,
    test: {
      ...config?.viteConfig?.test,
      // Evalite-controlled values that override user config
      testTimeout: testTimeout ?? 30_000,
      maxConcurrency: maxConcurrency,
      setupFiles: setupFiles,
      sequence: {
        ...config?.viteConfig?.test?.sequence,
        concurrent: config?.viteConfig?.test?.sequence?.concurrent ?? true,
      },
    },
  };

  const vitest = await createVitest(
    "test",
    {
      ...mergedViteConfig.test,
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
      forceRerunTriggers: forceRerunTriggers,
      root: cwd,
      include: ["**/*.eval.?(m)ts"],
      watch: opts.mode === "watch-for-file-changes",
      mode: "test",
      browser: undefined,
      config: false,
      allowOnly: true,
    },
    {
      ...mergedViteConfig,
    },
    {
      stdout: opts.testOutputWritable || process.stdout,
      stderr: opts.testOutputWritable || process.stderr,
    }
  );

  if (opts.configDebugMode) {
    const debugMessage = `[Evalite Config Debug] testTimeout: ${mergedViteConfig.test?.testTimeout}, maxConcurrency: ${mergedViteConfig.test?.maxConcurrency}\n`;
    if (opts.testOutputWritable) {
      opts.testOutputWritable.write(debugMessage);
    } else {
      process.stdout.write(debugMessage);
    }
  }

  vitest.provide("cwd", cwd);
  vitest.provide("trialCount", config?.trialCount);
  vitest.provide("serverPort", actualServerPort);
  vitest.provide("cacheDebug", opts.cacheDebug ?? false);
  vitest.provide("cacheEnabled", cacheEnabled);

  await vitest.start(filters);

  const disposeConsoleShortcuts = registerConsoleShortcuts(
    vitest,
    process.stdin,
    process.stdout
  );

  const rerun = async () => {
    await vitest.cancelCurrentRun("keyboard-input");
    const testFiles = vitest.state.getFilepaths();
    const specs = testFiles.flatMap((filepath) =>
      vitest.getModuleSpecifications(filepath)
    );
    await vitest.rerunTestSpecifications(specs, true);
  };

  if (server) {
    server.setRerunFn(rerun);
  }

  const shouldKeepRunning =
    vitest.shouldKeepServer() || opts.mode === "run-once-and-serve";

  if (!shouldKeepRunning) {
    disposeConsoleShortcuts();
    await vitest.close();

    await server?.stop();

    if (opts.outputPath) {
      await exportResultsToJSON({
        storage,
        outputPath: opts.outputPath,
        cwd,
      });
    }

    if (typeof exitCode === "number" && opts.mode === "run-once-and-exit") {
      process.exit(exitCode);
    }
  }

  return { vitest };
};

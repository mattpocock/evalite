import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Writable } from "stream";
import { createVitest, registerConsoleShortcuts } from "vitest/node";
import EvaliteReporter from "./reporter.js";
import { createSqliteAdapter } from "./adapters/sqlite.js";
import type { EvaliteAdapter } from "./adapters/types.js";
import type { Evalite } from "./types.js";
import { createServer } from "./server.js";
import { DEFAULT_SERVER_PORT } from "./constants.js";
import { DB_LOCATION, FILES_LOCATION } from "./backend-only-constants.js";
import { computeAverageScores } from "./adapters/utils.js";

declare module "vitest" {
  export interface ProvidedContext {
    cwd: string;
  }
}

const exportResultsToJSON = async (opts: {
  adapter: EvaliteAdapter;
  outputPath: string;
  cwd: string;
}) => {
  const latestFullRunResults = await opts.adapter.runs.getMany({
    runType: "full",
    orderBy: "created_at",
    orderDirection: "desc",
    limit: 1,
  });

  const latestFullRun = latestFullRunResults[0];
  if (!latestFullRun) {
    throw new Error("No completed run found to export");
  }

  const allEvals = await opts.adapter.evals.getMany({
    runIds: [latestFullRun.id],
    statuses: ["fail", "success"],
  });

  const evalResults = await opts.adapter.results.getMany({
    evalIds: allEvals.map((e) => e.id),
  });

  const allScores = await opts.adapter.scores.getMany({
    resultIds: evalResults.map((r) => r.id),
  });

  const allTraces = await opts.adapter.traces.getMany({
    resultIds: evalResults.map((r) => r.id),
  });

  const resultsAverageScores = computeAverageScores(allScores);

  // Group results by eval and transform to camelCase
  const outputData: Evalite.Exported.Output = {
    run: {
      id: latestFullRun.id,
      runType: latestFullRun.runType,
      createdAt: latestFullRun.created_at,
    },
    evals: allEvals.map((evaluation: any) => {
      const resultsForEval = evalResults.filter(
        (r: any) => r.eval_id === evaluation.id
      );

      const scoresForEval = allScores.filter((s: any) =>
        resultsForEval.some((r: any) => r.id === s.result_id)
      );

      const evalAvgScore =
        scoresForEval.length > 0
          ? scoresForEval.reduce((sum: number, s: any) => sum + s.score, 0) /
            scoresForEval.length
          : 0;

      return {
        id: evaluation.id,
        name: evaluation.name,
        filepath: evaluation.filepath,
        duration: evaluation.duration,
        status: evaluation.status,
        variantName: evaluation.variant_name,
        variantGroup: evaluation.variant_group,
        createdAt: evaluation.created_at,
        averageScore: evalAvgScore,
        results: resultsForEval.map((result: any) => {
          const resultAvgScore = resultsAverageScores.find(
            (r: any) => r.result_id === result.id
          );

          const scoresForResult = allScores.filter(
            (s: any) => s.result_id === result.id
          );

          const tracesForResult = allTraces.filter(
            (t: any) => t.result_id === result.id
          );

          return {
            id: result.id,
            duration: result.duration,
            input: result.input,
            output: result.output,
            expected: result.expected,
            status: result.status,
            colOrder: result.col_order,
            renderedColumns: result.rendered_columns,
            createdAt: result.created_at,
            averageScore: resultAvgScore?.average ?? 0,
            scores: scoresForResult.map((score: any) => ({
              id: score.id,
              name: score.name,
              score: score.score,
              description: score.description,
              metadata: score.metadata,
              createdAt: score.created_at,
            })),
            traces: tracesForResult.map((trace: any) => ({
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
  adapter?: EvaliteAdapter;
}) => {
  const cwd = opts.cwd ?? process.cwd();
  const filesLocation = path.join(cwd, FILES_LOCATION);
  await mkdir(filesLocation, { recursive: true });

  let adapter = opts.adapter;

  if (!adapter) {
    const dbLocation = path.join(cwd, DB_LOCATION);
    adapter = await createSqliteAdapter(dbLocation);
  }

  const filters = opts.path ? [opts.path] : undefined;
  process.env.EVALITE_REPORT_TRACES = "true";

  let server: ReturnType<typeof createServer> | undefined = undefined;

  if (
    opts.mode === "watch-for-file-changes" ||
    opts.mode === "run-once-and-serve"
  ) {
    server = createServer({
      adapter: adapter,
    });
    server.start(DEFAULT_SERVER_PORT);
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
          port: DEFAULT_SERVER_PORT,
          isWatching:
            opts.mode === "watch-for-file-changes" ||
            opts.mode === "run-once-and-serve",
          adapter: adapter,
          scoreThreshold: opts.scoreThreshold,
          modifyExitCode: (code) => {
            exitCode = code;
          },
          mode: opts.mode,
          hideTable: opts.hideTable,
        }),
      ],
      mode: "test",
      browser: undefined,
    },
    {
      plugins: [
        {
          name: "evalite-config-plugin",
          // Everything inside this config CAN be overridden
          config(config) {
            config.test ??= {};
            config.test.testTimeout ??= 30_000;

            config.test.sequence ??= {};
            config.test.sequence.concurrent ??= true;
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
        adapter,
        outputPath: opts.outputPath,
        cwd,
      });
    }

    if (typeof exitCode === "number") {
      process.exit(exitCode);
    }
  }
};

/**
 * @deprecated Use `runEvalite` instead. This export will be removed in a future version.
 */
export const runVitest = runEvalite;

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Writable } from "stream";
import { createVitest, registerConsoleShortcuts } from "vitest/node";
import EvaliteReporter from "./reporter.js";
import {
  createDatabase,
  getMostRecentRun,
  getEvals,
  getEvalsAverageScores,
  type SQLiteDatabase,
  getResults,
  getScores,
  getTraces,
  getAverageScoresFromResults,
} from "./db.js";
import type { Evalite } from "./types.js";
import { createServer } from "./server.js";
import { DEFAULT_SERVER_PORT } from "./constants.js";
import { DB_LOCATION, FILES_LOCATION } from "./backend-only-constants.js";

declare module "vitest" {
  export interface ProvidedContext {
    cwd: string;
  }
}

const exportResultsToJSON = async (opts: {
  db: SQLiteDatabase;
  outputPath: string;
  cwd: string;
}) => {
  const latestFullRun = getMostRecentRun(opts.db, "full");

  if (!latestFullRun) {
    console.warn("No completed run found to export");
    return;
  }

  const allEvals = getEvals(opts.db, [latestFullRun.id], ["fail", "success"]);
  const evalResults = getResults(
    opts.db,
    allEvals.map((e) => e.id).filter((i) => typeof i === "number")
  );

  const allScores = getScores(
    opts.db,
    evalResults.map((r) => r.id)
  );

  const allTraces = getTraces(
    opts.db,
    evalResults.map((r) => r.id)
  );

  const evalsAverageScores = getEvalsAverageScores(
    opts.db,
    allEvals.map((e) => e.id)
  );

  const resultsAverageScores = getAverageScoresFromResults(
    opts.db,
    evalResults.map((r) => r.id)
  );

  // Group results by eval and transform to camelCase
  const outputData: Evalite.Exported.Output = {
    run: {
      id: latestFullRun.id,
      runType: latestFullRun.runType,
      createdAt: latestFullRun.created_at,
    },
    evals: allEvals.map((evaluation) => {
      const evalAvgScore = evalsAverageScores.find(
        (e) => e.eval_id === evaluation.id
      );

      const resultsForEval = evalResults.filter(
        (r) => r.eval_id === evaluation.id
      );

      return {
        id: evaluation.id,
        name: evaluation.name,
        filepath: evaluation.filepath,
        duration: evaluation.duration,
        status: evaluation.status,
        variantName: evaluation.variant_name,
        variantGroup: evaluation.variant_group,
        createdAt: evaluation.created_at,
        averageScore: evalAvgScore?.average ?? 0,
        results: resultsForEval.map((result) => {
          const resultAvgScore = resultsAverageScores.find(
            (r) => r.result_id === result.id
          );

          const scoresForResult = allScores.filter(
            (s) => s.result_id === result.id
          );

          const tracesForResult = allTraces.filter(
            (t) => t.result_id === result.id
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
            scores: scoresForResult.map((score) => ({
              id: score.id,
              name: score.name,
              score: score.score,
              description: score.description,
              metadata: score.metadata,
              createdAt: score.created_at,
            })),
            traces: tracesForResult.map((trace) => ({
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
 * @param opts.path - Optional path filter to run specific eval files
 * @param opts.cwd - Working directory (defaults to current directory)
 * @param opts.testOutputWritable - Optional writable stream for test output
 * @param opts.mode - Execution mode: "watch-for-file-changes", "run-once-and-exit", or "run-once-and-serve"
 * @param opts.scoreThreshold - Optional score threshold (0-100) to fail the process if scores are below
 * @param opts.outputPath - Optional path to write test results in JSON format after completion
 *
 * @example
 * ```typescript
 * import { runEvalite } from "evalite/runner";
 *
 * // Run once and exit
 * await runEvalite({
 *   path: undefined,
 *   cwd: process.cwd(),
 *   mode: "run-once-and-exit",
 *   scoreThreshold: 80,
 *   outputPath: "./results.json"
 * });
 *
 * // Watch mode for development
 * await runEvalite({
 *   path: undefined,
 *   cwd: process.cwd(),
 *   mode: "watch-for-file-changes"
 * });
 * ```
 */
export const runEvalite = async (opts: {
  path: string | undefined;
  cwd: string | undefined;
  testOutputWritable?: Writable;
  mode: "watch-for-file-changes" | "run-once-and-exit" | "run-once-and-serve";
  scoreThreshold?: number;
  outputPath?: string;
}) => {
  const dbLocation = path.join(opts.cwd ?? "", DB_LOCATION);
  const filesLocation = path.join(opts.cwd ?? "", FILES_LOCATION);
  await mkdir(path.dirname(dbLocation), { recursive: true });
  await mkdir(filesLocation, { recursive: true });

  const db = createDatabase(dbLocation);
  const filters = opts.path ? [opts.path] : undefined;
  process.env.EVALITE_REPORT_TRACES = "true";

  let server: ReturnType<typeof createServer> | undefined = undefined;

  if (opts.mode === "watch-for-file-changes" || opts.mode === "run-once-and-serve") {
    server = createServer({
      db: db,
    });
    server.start(DEFAULT_SERVER_PORT);
  }

  let exitCode: number | undefined = undefined;

  const vitest = await createVitest(
    "test",
    {
      // Everything passed here cannot be
      // overridden by the user
      root: opts.cwd,
      include: ["**/*.eval.?(m)ts"],
      watch: opts.mode === "watch-for-file-changes",
      reporters: [
        new EvaliteReporter({
          logNewState: (newState) => {
            server?.updateState(newState);
          },
          port: DEFAULT_SERVER_PORT,
          isWatching: opts.mode === "watch-for-file-changes" || opts.mode === "run-once-and-serve",
          db: db,
          scoreThreshold: opts.scoreThreshold,
          modifyExitCode: (code) => {
            exitCode = code;
          },
          mode: opts.mode,
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

  vitest.provide("cwd", opts.cwd ?? "");

  await vitest.start(filters);

  const dispose = registerConsoleShortcuts(
    vitest,
    process.stdin,
    process.stdout
  );

  const shouldKeepRunning = vitest.shouldKeepServer() || opts.mode === "run-once-and-serve";

  if (!shouldKeepRunning) {
    dispose();
    await vitest.close();

    if (opts.outputPath) {
      await exportResultsToJSON({
        db,
        outputPath: opts.outputPath,
        cwd: opts.cwd ?? "",
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

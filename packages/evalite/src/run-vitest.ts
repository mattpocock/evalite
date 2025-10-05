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
} from "./db.js";
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
    allEvals.map((e) => e.id).filter((i) => typeof i === "number"),
  );

  const scores = getScores(
    opts.db,
    evalResults.map((r) => r.id),
  );

  const evalsAverageScores = getEvalsAverageScores(
    opts.db,
    allEvals.map((e) => e.id),
  );

  const results = evalResults.map((result) => {
    return {
      ...result,
      average: evalsAverageScores.find((e) => e.eval_id === result.eval_id)
        ?.average,
      scores: scores.filter((s) => s.result_id === result.id),
    };
  });

  const outputData = {
    runId: latestFullRun.id,
    runType: latestFullRun.runType,
    created_at: latestFullRun.created_at,
    evals: results,
  };

  const absolutePath = path.isAbsolute(opts.outputPath)
    ? opts.outputPath
    : path.join(opts.cwd, opts.outputPath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, JSON.stringify(outputData, null, 2), "utf-8");

  console.log(`\nResults exported to: ${absolutePath}`);
};

export const runVitest = async (opts: {
  path: string | undefined;
  cwd: string | undefined;
  testOutputWritable?: Writable;
  mode: "watch-for-file-changes" | "run-once-and-exit";
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

  if (opts.mode === "watch-for-file-changes") {
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
          isWatching: opts.mode === "watch-for-file-changes",
          db: db,
          scoreThreshold: opts.scoreThreshold,
          modifyExitCode: (code) => {
            exitCode = code;
          },
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
    },
  );

  vitest.provide("cwd", opts.cwd ?? "");

  await vitest.start(filters);

  const dispose = registerConsoleShortcuts(
    vitest,
    process.stdin,
    process.stdout,
  );

  if (!vitest.shouldKeepServer()) {
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

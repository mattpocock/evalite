import { mkdir } from "fs/promises";
import path from "path";
import { Writable } from "stream";
import { createVitest, registerConsoleShortcuts, type Vitest } from "vitest/node";
import EvaliteReporter from "./reporter.js";
import { createDatabase } from "./db.js";
import { createServer } from "./server.js";
import { DEFAULT_SERVER_PORT } from "./constants.js";
import { DB_LOCATION, FILES_LOCATION } from "./backend-only-constants.js";

declare module "vitest" {
  export interface ProvidedContext {
    cwd: string;
  }
}

const createVitestConfig = (opts: {
  cwd: string | undefined;
  watch: boolean;
  isWatching: boolean;
  db: ReturnType<typeof createDatabase>;
  scoreThreshold?: number;
  testOutputWritable?: Writable;
  modifyExitCode?: (code: number) => void;
  logNewState?: (newState: any) => void;
}): Parameters<typeof createVitest>[1] => ({
  // Everything passed here cannot be overridden by the user
  root: opts.cwd,
  include: ["**/*.eval.?(m)ts"],
  watch: opts.watch,
  reporters: [
    new EvaliteReporter({
      logNewState: opts.logNewState || (() => {}),
      port: DEFAULT_SERVER_PORT,
      isWatching: opts.isWatching,
      db: opts.db,
      scoreThreshold: opts.scoreThreshold,
      modifyExitCode: opts.modifyExitCode || (() => {}),
    }),
  ],
  mode: "test",
  browser: undefined,
});

const createVitestPlugins = (): Parameters<typeof createVitest>[2] => ({
  plugins: [
    {
      name: "evalite-config-plugin",
      // Everything inside this config CAN be overridden
      config(config: any) {
        config.test ??= {};
        config.test.testTimeout ??= 30_000;

        config.test.sequence ??= {};
        config.test.sequence.concurrent ??= true;
      },
    },
  ],
});

const createVitestOptions = (opts: {
  testOutputWritable?: Writable;
}): Parameters<typeof createVitest>[3] => ({
  stdout: opts.testOutputWritable || process.stdout,
  stderr: opts.testOutputWritable || process.stderr,
});

export const runVitest = async (opts: {
  path: string | undefined;
  cwd: string | undefined;
  testOutputWritable?: Writable;
  mode: "watch-for-file-changes" | "run-once-and-exit" | "serve-without-watching";
  scoreThreshold?: number;
}) => {
  const dbLocation = path.join(opts.cwd ?? "", DB_LOCATION);
  const filesLocation = path.join(opts.cwd ?? "", FILES_LOCATION);
  await mkdir(path.dirname(dbLocation), { recursive: true });
  await mkdir(filesLocation, { recursive: true });

  const db = createDatabase(dbLocation);
  const filters = opts.path ? [opts.path] : undefined;

  process.env.EVALITE_REPORT_TRACES = "true";

  let server: ReturnType<typeof createServer> | undefined = undefined;
  let vitest: Vitest | undefined = undefined;

  let exitCode: number | undefined = undefined;

  vitest = await createVitest(
    "test",
    createVitestConfig({
      cwd: opts.cwd,
      watch: opts.mode === "watch-for-file-changes",
      isWatching: opts.mode === "watch-for-file-changes",
      db,
      scoreThreshold: opts.scoreThreshold,
      testOutputWritable: opts.testOutputWritable,
      modifyExitCode: (code) => {
        exitCode = code;
      },
      logNewState: (newState) => {
        server?.updateState(newState);
      },
    }),
    createVitestPlugins(),
    createVitestOptions({ testOutputWritable: opts.testOutputWritable })
  );

  vitest.provide("cwd", opts.cwd ?? "");

  // Create triggerRun function for manual runs (after vitest is initialized)
  const triggerRun = async () => {
    if (opts.mode === "watch-for-file-changes" && vitest) {
      // In watch mode, use rerunFiles() - it works here
      try {
        await vitest.rerunFiles(undefined, "manual", true);
      } catch (error) {
        console.error("Error in manual run:", error);
      }
    } else {
      // In serve mode, create fresh instance for reliability
      const manualVitest = await createVitest(
        "test",
        createVitestConfig({
          cwd: opts.cwd,
          watch: false, // Never watch for manual runs
          isWatching: false, // Manual runs are never watching
          db,
          scoreThreshold: opts.scoreThreshold,
          testOutputWritable: opts.testOutputWritable,
          modifyExitCode: () => {
            // Don't exit process for manual runs
          },
          logNewState: (newState) => {
            server?.updateState(newState);
          },
        }),
        createVitestPlugins(),
        createVitestOptions({ testOutputWritable: opts.testOutputWritable })
      );

      manualVitest.provide("cwd", opts.cwd ?? "");

      try {
        await manualVitest.start(filters);
        await manualVitest.close();
      } catch (error) {
        console.error("Error in manual run:", error);
        await manualVitest.close();
      }
    }
  };

  if (opts.mode === "watch-for-file-changes" || opts.mode === "serve-without-watching") {
    server = createServer({
      db,
      triggerRun,
    });
    server.start(DEFAULT_SERVER_PORT); 
  }

  // Only start vitest immediately if not in serve mode
  if (opts.mode !== "serve-without-watching") {
    await vitest.start(filters);
  }

  const dispose = registerConsoleShortcuts(
    vitest,
    process.stdin,
    process.stdout
  );

  if (!vitest.shouldKeepServer()) {
    dispose();
    await vitest.close();

    if (typeof exitCode === "number") {
      process.exit(exitCode);
    }
  }
};

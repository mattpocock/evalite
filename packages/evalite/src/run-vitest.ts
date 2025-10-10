import { mkdir } from "fs/promises";
import path from "path";
import { Writable } from "stream";
import { createVitest, registerConsoleShortcuts } from "vitest/node";
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

export const runVitest = async (opts: {
  path: string | undefined;
  cwd: string | undefined;
  testOutputWritable?: Writable;
  mode: "watch-for-file-changes" | "run-once-and-exit";
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
    }
  );

  vitest.provide("cwd", opts.cwd ?? "");

  await vitest.start(filters);

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

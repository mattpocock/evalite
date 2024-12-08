import path from "path";
import { Writable } from "stream";
import { createVitest } from "vitest/node";
import EvaliteReporter from "./reporter.js";
import { createHash } from "crypto";
import {
  DEFAULT_SERVER_PORT,
  reportEventToJsonDb,
  type JsonDBEvent,
} from "@evalite/core";
import { createServer } from "@evalite/core/server";

export const runVitest = async (opts: {
  path: string | undefined;
  cwd: string | undefined;
  testOutputWritable?: Writable;
  mode: "watch-for-file-changes" | "run-once-and-exit";
}) => {
  const jsonDbLocation = path.join(opts.cwd ?? "", "./evalite-report.jsonl");

  const filters = opts.path ? [opts.path] : undefined;

  process.env.EVALITE_REPORT_TRACES = "true";

  const server = createServer({
    jsonDbLocation,
  });

  if (opts.mode === "watch-for-file-changes") {
    server.start(DEFAULT_SERVER_PORT);
  }

  const vitest = await createVitest(
    "test",
    {
      root: opts.cwd,
      include: ["**/*.eval.{js,ts}"],
      watch: opts.mode === "watch-for-file-changes",
      sequence: {
        concurrent: true,
      },
      reporters: [
        new EvaliteReporter({
          jsonDbLocation,
          logEvent: (event) => {
            server.send(event);
            if (event.type === "RUN_IN_PROGRESS") {
              const startTime: string = new Date().toISOString();

              reportEventToJsonDb({
                dbLocation: jsonDbLocation,
                event:
                  event.runType === "full"
                    ? {
                        startTime,
                        type: "FULL_RUN_BEGIN",
                      }
                    : {
                        startTime,
                        type: "PARTIAL_RUN_BEGIN",
                      },
              });
            }
          },
          port: DEFAULT_SERVER_PORT,
          isWatching: opts.mode === "watch-for-file-changes",
        }),
      ],
      testTimeout: 30_000,
    },
    {},
    {
      stdout: opts.testOutputWritable || process.stdout,
      stderr: opts.testOutputWritable || process.stderr,
    }
  );

  await vitest.collect(filters);

  const allFileResults = Array.from(vitest.vitenode.fetchCache);

  const sourceFileResults = allFileResults.filter(([path, item]) => {
    return !(path.endsWith(".eval.ts") || path.endsWith(".eval.js"));
  });

  const codeFromSourceFiles = sourceFileResults.reduce((acc, [path, item]) => {
    return acc + (item.result.code ?? "");
  }, "");

  const hash = createHash("sha256").update(codeFromSourceFiles).digest("hex");

  vitest.provide("evaliteInputHash", hash);

  await vitest.start(filters);

  if (!vitest.shouldKeepServer()) {
    return await vitest.exit();
  }

  if (opts.mode === "watch-for-file-changes") {
    process.stdin.setRawMode(true);
    process.stdin.on("data", async (data) => {
      if (data.toString() === "q") {
        await vitest.exit();
        process.exit(0);
      }
    });
  }
};

import { randomUUID } from "crypto";
import { cpSync, rmSync } from "fs";
import path from "path";
import { Writable } from "stream";
import stripAnsi from "strip-ansi";
import type { Evalite } from "evalite";
import { runEvalite } from "evalite/runner";
import { createInMemoryStorage } from "evalite/in-memory-storage";
import type { Vitest } from "vitest/node";

const FIXTURES_DIR = path.join(import.meta.dirname, "./fixtures");
const PLAYGROUND_DIR = path.join(import.meta.dirname, "./playground");

export const loadFixture = async (
  name: "basics" | "failing-test" | (string & {})
) => {
  const fixturePath = path.join(FIXTURES_DIR, name);

  const dirName = randomUUID().slice(0, 8);

  const dirPath = path.join(PLAYGROUND_DIR, dirName);

  cpSync(fixturePath, dirPath, {
    force: true,
    recursive: true,
  });

  await using storage = await createInMemoryStorage();

  const captured = captureStdout();

  let vitestInstance: Vitest | undefined = undefined;

  return {
    dir: dirPath,
    storage,
    getOutput: () => captured.getOutput(),
    getVitest: () => vitestInstance,
    [Symbol.asyncDispose]: async () => {
      if (vitestInstance) {
        await vitestInstance.close();
      }
      rmSync(dirPath, {
        recursive: true,
        force: true,
      });
    },
    run: async (opts: {
      path?: string | undefined;
      mode:
        | "watch-for-file-changes"
        | "run-once-and-exit"
        | "run-once-and-serve";
      scoreThreshold?: number;
      outputPath?: string;
      hideTable?: boolean;
      configDebugMode?: boolean;
    }) => {
      vitestInstance = await runEvalite({
        ...opts,
        cwd: dirPath,
        storage,
        testOutputWritable: captured.writable,
        disableServer: true,
      });
      return vitestInstance;
    },
    waitForTestRunEnd: async (): Promise<void> => {
      return vitestInstance?.waitForTestRunEnd();
    },
  };
};

export const captureStdout = () => {
  const writable = new Writable();

  let output = "";

  writable.write = ((chunk: any, encoding: any, callback: any) => {
    output += chunk.toString("utf-8");
    callback?.(undefined);
    return true;
  }) as any;

  return {
    writable,
    getOutput: () => stripAnsi(output),
  };
};

/**
 * Trigger a watch mode rerun and wait for it to complete.
 * Gets test specifications from Vitest state and triggers a rerun.
 */
export const triggerWatchModeRerun = async (vitest: Vitest) => {
  const testFiles = vitest.state.getFilepaths();
  const specs = testFiles.flatMap((filepath) =>
    vitest.getModuleSpecifications(filepath)
  );
  await vitest.rerunTestSpecifications(specs, true);

  await vitest.waitForTestRunEnd();
};

export interface SuiteWithInlineResults extends Evalite.Storage.Entities.Suite {
  evals: EvalWithInlineScoresAndTraces[];
}

export interface EvalWithInlineScoresAndTraces
  extends Evalite.Storage.Entities.Eval {
  scores: Evalite.Storage.Entities.Score[];
  traces: Evalite.Storage.Entities.Trace[];
}

/**
 * Get suites as a record using the new storage API.
 */
export const getSuitesAsRecordViaStorage = async (
  storage: Evalite.Storage
): Promise<Record<string, SuiteWithInlineResults[]>> => {
  const suites = await storage.suites.getMany();
  const suiteIds = suites.map((e) => e.id);

  const evals =
    suiteIds.length > 0
      ? await storage.evals.getMany({ suiteIds: suiteIds })
      : [];
  const evalIds = evals.map((r) => r.id);

  const scores =
    evalIds.length > 0 ? await storage.scores.getMany({ evalIds }) : [];
  const traces =
    evalIds.length > 0 ? await storage.traces.getMany({ evalIds }) : [];

  const recordOfSuites: Record<string, SuiteWithInlineResults[]> = {};

  for (const suite of suites) {
    const key = suite.name;
    if (!recordOfSuites[key]) {
      recordOfSuites[key] = [];
    }

    const evalResults = evals.filter((r) => r.suite_id === suite.id);
    const resultsWithScoresAndTraces = evalResults.map((r) => {
      const resultScores = scores.filter((s) => s.eval_id === r.id);
      const resultTraces = traces.filter((t) => t.eval_id === r.id);

      return { ...r, scores: resultScores, traces: resultTraces };
    });

    recordOfSuites[key].push({
      ...suite,
      evals: resultsWithScoresAndTraces,
    });
  }

  return recordOfSuites;
};

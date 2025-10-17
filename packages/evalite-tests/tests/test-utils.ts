import { DB_LOCATION } from "evalite/backend-only-constants";
import { randomUUID } from "crypto";
import { cpSync, rmSync } from "fs";
import path from "path";
import { Writable } from "stream";
import stripAnsi from "strip-ansi";
import type { Evalite } from "evalite";
import type { EvaliteAdapter } from "evalite/types";
import { runEvalite } from "evalite/runner";
import { createInMemoryAdapter } from "evalite/in-memory-adapter";

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

  await using adapter = await createInMemoryAdapter();

  const captured = captureStdout();

  return {
    dir: dirPath,
    adapter,
    getOutput: () => captured.getOutput(),
    [Symbol.dispose]: () => {
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
    }) => {
      await runEvalite({
        ...opts,
        cwd: dirPath,
        adapter,
        testOutputWritable: captured.writable,
      });
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

export interface EvalWithInlineResults extends Evalite.Adapter.Entities.Eval {
  results: ResultWithInlineScoresAndTraces[];
}

export interface ResultWithInlineScoresAndTraces
  extends Evalite.Adapter.Entities.Result {
  scores: Evalite.Adapter.Entities.Score[];
  traces: Evalite.Adapter.Entities.Trace[];
}

/**
 * Get evals as a record using the new adapter API.
 * Replaces deprecated getEvalsAsRecord.
 */
export const getEvalsAsRecordViaAdapter = async (
  adapter: EvaliteAdapter
): Promise<Record<string, EvalWithInlineResults[]>> => {
  const evals = await adapter.evals.getMany();
  const evalIds = evals.map((e) => e.id);

  const results =
    evalIds.length > 0 ? await adapter.results.getMany({ evalIds }) : [];
  const resultIds = results.map((r) => r.id);

  const scores =
    resultIds.length > 0 ? await adapter.scores.getMany({ resultIds }) : [];
  const traces =
    resultIds.length > 0 ? await adapter.traces.getMany({ resultIds }) : [];

  const recordOfEvals: Record<string, EvalWithInlineResults[]> = {};

  for (const evaluation of evals) {
    const key = evaluation.name;
    if (!recordOfEvals[key]) {
      recordOfEvals[key] = [];
    }

    const evalResults = results.filter((r) => r.eval_id === evaluation.id);
    const resultsWithScoresAndTraces = evalResults.map((r) => {
      const resultScores = scores.filter((s) => s.result_id === r.id);
      const resultTraces = traces.filter((t) => t.result_id === r.id);

      return { ...r, scores: resultScores, traces: resultTraces };
    });

    recordOfEvals[key].push({
      ...evaluation,
      results: resultsWithScoresAndTraces,
    });
  }

  return recordOfEvals;
};

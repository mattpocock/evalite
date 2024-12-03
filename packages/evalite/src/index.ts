import type { Evalite } from "@evalite/core";
import { inject, it, type Test } from "vitest";
import { reportTraceLocalStorage } from "./traces.js";

declare module "vitest" {
  interface TaskMeta {
    evalite?: Evalite.TaskMeta;
  }
}

const runTask = async <TInput, TExpected>(opts: {
  input: TInput;
  expected: TExpected | undefined;
  task: (input: TInput) => Evalite.MaybePromise<TExpected>;
  scores: Evalite.Scorer<TExpected>[];
}) => {
  const start = performance.now();
  const result = await opts.task(opts.input);
  const duration = Math.round(performance.now() - start);

  const scores = await Promise.all(
    opts.scores.map(
      async (scorer) =>
        await scorer({ output: result, expected: opts.expected })
    )
  );

  return {
    result,
    scores,
    duration,
  };
};

const runEval = async <TInput, TExpected>(
  task: Readonly<Test>,
  opts: Evalite.RunnerOpts<TInput, TExpected>
) => {
  if (opts.scorers.length === 0) {
    throw new Error("You must provide at least one scorer.");
  }

  const traces: Evalite.StoredTrace[] = [];

  reportTraceLocalStorage.enterWith((trace) => traces.push(trace));

  const sourceCodeHash = inject("evaliteInputHash");

  const data = await opts.data();
  const start = performance.now();
  const results = await Promise.all(
    data.map(async ({ input, expected }): Promise<Evalite.Result> => {
      const { result, scores, duration } = await runTask({
        expected,
        input,
        scores: opts.scorers,
        task: opts.task,
      });

      return {
        input,
        result,
        scores,
        duration,
        expected,
      };
    })
  );
  task.meta.evalite = {
    results,
    duration: Math.round(performance.now() - start),
    sourceCodeHash,
    traces,
  };
};

function evaliteBase<TInput, TExpected>(
  testName: string,
  opts: Evalite.RunnerOpts<TInput, TExpected>
) {
  return it(testName, async ({ task }) => {
    await runEval(task, opts);
  });
}

evaliteBase.only = function evaliteOnly<TInput, TExpected>(
  testName: string,
  opts: Evalite.RunnerOpts<TInput, TExpected>
) {
  return it.only(testName, async ({ task }) => {
    await runEval(task, opts);
  });
};

export const evalite = evaliteBase as Evalite.Runner;

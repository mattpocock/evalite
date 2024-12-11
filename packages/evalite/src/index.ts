import type { Evalite } from "@evalite/core";
import { describe, it } from "vitest";
import { reportTraceLocalStorage } from "./traces.js";

declare module "vitest" {
  interface TaskMeta {
    evalite?: Evalite.TaskMeta;
  }
}

const joinArrayOfUnknownResults = (results: unknown[]): unknown => {
  return results.reduce((acc, result) => {
    if (
      typeof result === "string" ||
      typeof result === "number" ||
      typeof result === "boolean"
    ) {
      return `${acc}${result}`;
    }
    throw new Error(
      `Cannot display results of stream: stream contains non-string, non-number, non-boolean chunks.`
    );
  }, "");
};

const executeTask = async <TInput, TExpected>(
  task: Evalite.Task<TInput, TExpected>,
  input: TInput
): Promise<TExpected> => {
  const taskResultOrStream = await task(input);

  if (
    typeof taskResultOrStream === "object" &&
    taskResultOrStream &&
    Symbol.asyncIterator in taskResultOrStream
  ) {
    const chunks: TExpected[] = [];

    for await (const chunk of taskResultOrStream) {
      chunks.push(chunk);
    }

    return joinArrayOfUnknownResults(chunks) as TExpected;
  }

  return taskResultOrStream;
};

const runTask = async <TInput, TExpected>(opts: {
  input: TInput;
  expected: TExpected | undefined;
  task: Evalite.Task<TInput, TExpected>;
  scores: Evalite.Scorer<TInput, TExpected>[];
}) => {
  const start = performance.now();
  const output = await executeTask(opts.task, opts.input);
  const duration = Math.round(performance.now() - start);

  const scores = await Promise.all(
    opts.scores.map(
      async (scorer) =>
        await scorer({
          input: opts.input,
          output,
          expected: opts.expected,
        })
    )
  );

  return {
    output,
    scores,
    duration,
  };
};

export const evalite = <TInput, TExpected = TInput>(
  evalName: string,
  opts: Evalite.RunnerOpts<TInput, TExpected>
) => {
  return describe(evalName, async () => {
    const dataset = await opts.data();

    for (const [order, data] of Object.entries(dataset)) {
      it(`${evalName} ${order}`, { concurrent: true }, async ({ task }) => {
        task.meta.evalite = {
          duration: undefined,
          initialResult: {
            evalName: evalName,
            filepath: task.file.filepath,
            input: data.input,
            expected: data.expected,
            order: Number(order),
          },
        };
        const start = performance.now();

        const traces: Evalite.Trace[] = [];
        reportTraceLocalStorage.enterWith((trace) => traces.push(trace));

        const { output, scores, duration } = await runTask({
          expected: data.expected,
          input: data.input,
          scores: opts.scorers,
          task: opts.task,
        });
        task.meta.evalite = {
          result: {
            evalName: evalName,
            filepath: task.file.filepath,
            order: Number(order),
            duration,
            expected: data.expected,
            input: data.input,
            output,
            scores,
            traces,
          },
          duration: Math.round(performance.now() - start),
        };
      });
    }
  });
};

export const createScorer = <TInput, TExpected = TInput>(opts: {
  name: string;
  description?: string;
  scorer: (
    input: Evalite.ScoreInput<TInput, TExpected>
  ) => Evalite.MaybePromise<number | Evalite.UserProvidedScoreWithMetadata>;
}): Evalite.Scorer<TInput, TExpected> => {
  return async (input: Evalite.ScoreInput<TInput, TExpected>) => {
    const score = await opts.scorer(input);

    if (typeof score === "object") {
      if (typeof score.score !== "number") {
        throw new Error(`The scorer '${opts.name}' must return a number.`);
      }

      return {
        score: score.score,
        metadata: score.metadata,
        description: opts.description,
        name: opts.name,
      };
    }

    if (typeof score !== "number") {
      throw new Error(`The scorer '${opts.name}' must return a number.`);
    }
    return {
      description: opts.description,
      name: opts.name,
      score,
    };
  };
};

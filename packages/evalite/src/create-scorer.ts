import type { Evalite } from "./types.js";

export const createScorer = <
  TInput,
  TOutput,
  TExpected = TOutput,
  TMetadata = unknown,
>(
  opts: Evalite.ScorerOpts<TInput, TOutput, TExpected, TMetadata>
): Evalite.Scorer<TInput, TOutput, TExpected, TMetadata> => {
  return async (
    input: Evalite.ScoreInput<TInput, TOutput, TExpected, TMetadata>
  ) => {
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

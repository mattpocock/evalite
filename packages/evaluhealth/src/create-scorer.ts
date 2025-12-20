import type { Evaluhealth } from "./types.js";

export const createScorer = <TInput, TOutput, TExpected = TOutput>(
  opts: Evaluhealth.ScorerOpts<TInput, TOutput, TExpected>
): Evaluhealth.Scorer<TInput, TOutput, TExpected> => {
  return async (input: Evaluhealth.ScoreInput<TInput, TOutput, TExpected>) => {
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

import type { Evalite } from "./types.js";

export const createScorer = <TInput, TOutput, TExpected = TOutput>(
  opts: Evalite.ScorerOpts<TInput, TOutput, TExpected>
): Evalite.Scorer<TInput, TOutput, TExpected> => {
  return async (input: Evalite.ScoreInput<TInput, TOutput, TExpected>) => {
    const scores = await opts.scorer(input);
    const scoresArray = Array.isArray(scores) ? scores : [scores];

    return scoresArray.map((score) => {
      if (typeof score === "object" && score !== null) {
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
    });
  };
};

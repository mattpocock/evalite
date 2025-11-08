import type { Evalite } from "./types.js";

export const createScorer = <TInput, TOutput, TExpected>(
  opts: Evalite.ScorerOpts<TInput, TOutput, TExpected>
): Evalite.Scorer<TInput, TOutput, TExpected> => {
  return async (input: Evalite.ScoreInput<TInput, TOutput, TExpected>) => {
    const score = await opts.scorer(input);

    if (typeof score === "object") {
      if (typeof score.score !== "number") {
        throw new Error(
          `The scorer '${opts.name ?? "Unnamed Scorer"}' must return a number.`
        );
      }

      return {
        score: score.score,
        metadata: score.metadata,
        description: opts.description ?? score.description,
        name: opts.name ?? score.name ?? "Unnamed Scorer",
      };
    }

    if (typeof score !== "number") {
      throw new Error(
        `The scorer '${opts.name ?? "Unnamed Scorer"}' must return a number.`
      );
    }
    return {
      description: opts.description,
      name: opts.name ?? "Unnamed Scorer",
      score,
    };
  };
};

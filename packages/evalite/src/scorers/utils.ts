import type { Evalite } from "../types.js";

export function isSingleTurnSample(sample: Evalite.EvaluationSample) {
  if ("query" in sample) return true;
  return false;
}

export function failedToScore(
  reason: string
): Evalite.UserProvidedScoreWithMetadata {
  return {
    score: 0,
    metadata: {
      reason,
    },
  };
}

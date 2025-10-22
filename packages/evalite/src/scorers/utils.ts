import type { Evalite } from "../types.js";

export function isSingleTurnSample(sample: Evalite.Scorers.EvaluationSample) {
  if ("query" in sample) return true;
  return false;
}

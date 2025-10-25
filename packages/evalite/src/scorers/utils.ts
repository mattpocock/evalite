import type { Evalite } from "../types.js";

export function isSingleTurnOutput(
  output: Evalite.Scorers.SingleOrMultiTurnOutput
): output is Evalite.Scorers.SingleTurnOutput {
  return typeof output === "string";
}

export function isMultiTurnOutput(
  output: Evalite.Scorers.SingleOrMultiTurnOutput
): output is Evalite.Scorers.MultiTurnOutput {
  return Array.isArray(output);
}

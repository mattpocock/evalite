import type { Evalite } from "../types.js";

/**
 * Checks if the output is a simple string (vs a
 * conversation with multiple messages).
 */
export function isSingleTurnOutput(
  output: Evalite.Scorers.SingleOrMultiTurnOutput
): output is Evalite.Scorers.SingleTurnOutput {
  return typeof output === "string";
}

/**
 * Checks if the output is a conversation with
 * multiple back-and-forth messages.
 */
export function isMultiTurnOutput(
  output: Evalite.Scorers.SingleOrMultiTurnOutput
): output is Evalite.Scorers.MultiTurnOutput {
  return Array.isArray(output);
}

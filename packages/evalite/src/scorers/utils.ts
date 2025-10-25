import type { Evalite } from "../types.js";

export function isSingleTurnInput(
  input: Evalite.Scorers.SingleOrMultiTurnInput
): input is Evalite.Scorers.SingleTurnInput {
  return typeof input === "string";
}

export function isMultiTurnInput(
  input: Evalite.Scorers.SingleOrMultiTurnInput
): input is Evalite.Scorers.MultiTurnInput {
  return Array.isArray(input);
}

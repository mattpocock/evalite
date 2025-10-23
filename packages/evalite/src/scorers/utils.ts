import type { Evalite } from "../types.js";
import type { ModelMessage, UserModelMessage } from "ai";

export function isSingleTurn(
  opts: Evalite.ScoreInput<
    string | ModelMessage[],
    string,
    Evalite.Scorers.SingleTurnData | Evalite.Scorers.MultiTurnData
  >
): opts is Evalite.ScoreInput<string, string, Evalite.Scorers.SingleTurnData> {
  return typeof opts.input === "string";
}

export function isMultiTurn(
  opts: Evalite.ScoreInput<
    string | ModelMessage[],
    string,
    Evalite.Scorers.SingleTurnData | Evalite.Scorers.MultiTurnData
  >
): opts is Evalite.ScoreInput<
  ModelMessage[],
  string,
  Evalite.Scorers.MultiTurnData
> {
  return Array.isArray(opts.input);
}

import type { Evalite } from "evalite";
import type { ScoreState } from "./score";

export const getScoreState = (opts: {
  status: Evalite.Storage.Entities.EvalStatus;
  score: number;
  prevScore: number | null | undefined;
}) => {
  if (opts.status === "fail") {
    return "failed";
  }

  if (opts.status === "running") {
    return "loading";
  }

  const state: ScoreState =
    typeof opts.prevScore === "undefined" || opts.prevScore === null
      ? "first"
      : opts.score > opts.prevScore
        ? "up"
        : opts.score < opts.prevScore
          ? "down"
          : "same";

  return state;
};

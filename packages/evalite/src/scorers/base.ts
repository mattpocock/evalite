import type { Evalite } from "../types.js";
import type { EmbeddingModel, LanguageModel, ModelMessage } from "ai";
import { createScorer } from "../create-scorer.js";
import { isMultiTurn, isSingleTurn } from "./utils.js";

export function createBaseScorer<TOpts extends object = {}>({
  name,
  description,
  singleTurn,
  multiTurn,
}: Evalite.Scorers.BaseScorerOpts<TOpts>): Evalite.Scorers.BaseFactory<TOpts> {
  return (opts: TOpts) =>
    createScorer<
      string | ModelMessage[],
      string,
      Evalite.Scorers.SingleTurnData | Evalite.Scorers.MultiTurnData
    >({
      name,
      description,
      scorer: async (evalOpts) => {
        if (isSingleTurn(evalOpts)) {
          if (!singleTurn)
            throw new Error("This scorer does not support single turn inputs");

          return singleTurn({
            ...evalOpts,
            expected: evalOpts.expected ?? {},
            ...opts,
          });
        } else if (isMultiTurn(evalOpts)) {
          if (!multiTurn)
            throw new Error("This scorer does not support multi turn inputs");

          return multiTurn({
            ...evalOpts,
            expected: evalOpts.expected ?? {},
            ...opts,
          });
        }
        throw new Error("Invalid scorer options");
      },
    });
}

export function createLLMScorer<T extends object = {}>(
  opts: Evalite.Scorers.BaseScorerOpts<{ model: LanguageModel } & T>
): Evalite.Scorers.LLMBasedFactory<T> {
  return createBaseScorer(opts);
}

export function createEmbeddingScorer<T extends object = {}>(
  opts: Evalite.Scorers.BaseScorerOpts<{ embeddingModel: EmbeddingModel } & T>
): Evalite.Scorers.EmbeddingBasedFactory<T> {
  return createBaseScorer(opts);
}

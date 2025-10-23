import type { Evalite } from "../types.js";
import type { EmbeddingModel, LanguageModel, ModelMessage } from "ai";
import { createScorer } from "../create-scorer.js";
import { isMultiTurn, isSingleTurn } from "./utils.js";

interface BaseScorerOpts<TInput extends object = {}> {
  name: string;
  description: string;
  singleTurn?: (
    opts: {
      input: string;
      output: string;
      expected: Evalite.Scorers.SingleTurnData;
    } & TInput
  ) => Evalite.MaybePromise<Evalite.Scorers.BaseResult>;
  multiTurn?: (
    opts: {
      input: ModelMessage[];
      output: string;
      expected: Evalite.Scorers.MultiTurnData;
    } & TInput
  ) => Evalite.MaybePromise<Evalite.Scorers.BaseResult>;
}

export function createBaseScorer<TInput extends object = {}>({
  name,
  description,
  singleTurn,
  multiTurn,
}: BaseScorerOpts<TInput>): Evalite.Scorers.BaseFactory<TInput> {
  return (opts: TInput) =>
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
            expected:
              evalOpts.expected ?? ({} as Evalite.Scorers.SingleTurnData),
            ...opts,
          });
        } else if (isMultiTurn(evalOpts)) {
          if (!multiTurn)
            throw new Error("This scorer does not support multi turn inputs");

          return multiTurn({
            ...evalOpts,
            expected:
              evalOpts.expected ?? ({} as Evalite.Scorers.MultiTurnData),
            ...opts,
          });
        }
        throw new Error("Invalid scorer options");
      },
    });
}

export function createLLMScorer(
  opts: BaseScorerOpts<{ model: LanguageModel }>
): Evalite.Scorers.LLMBasedFactory {
  return createBaseScorer(opts);
}

export function createEmbeddingScorer(
  opts: BaseScorerOpts<{ embeddingModel: EmbeddingModel }>
): Evalite.Scorers.EmbeddingBasedFactory {
  return createBaseScorer(opts);
}

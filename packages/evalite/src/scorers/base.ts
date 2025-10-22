import type { Evalite } from "../types.js";
import type { EmbeddingModel, LanguageModel } from "ai";

export function createLLMBasedScorer<TInput extends object = {}>(
  fn: (opts: { model: LanguageModel } & TInput) => Evalite.Scorers.Scorer
): Evalite.Scorers.LLMBased<TInput> {
  return (opts) => {
    return fn(opts);
  };
}

export function createEmbeddingBasedScorer<TInput extends object = {}>(
  fn: (
    opts: { embeddingModel: EmbeddingModel } & TInput
  ) => Evalite.Scorers.Scorer
): Evalite.Scorers.EmbeddingBased<TInput> {
  return (opts) => {
    return fn(opts);
  };
}

import type { Evalite } from "../types.js";
import type { EmbeddingModel, LanguageModel } from "ai";

type Scorer = Evalite.Scorer<Evalite.EvaluationSample, string, string>;

export type LLMBasedScorer<TInput extends object = {}> = (
  opts: { model: LanguageModel } & TInput
) => Scorer;

export type EmbeddingBasedScorer<TInput extends object = {}> = (
  opts: {
    embedding: EmbeddingModel;
  } & TInput
) => Scorer;

export function createLLMBasedScorer<TInput extends object = {}>(
  fn: (opts: { model: LanguageModel } & TInput) => Scorer
): LLMBasedScorer<TInput> {
  return (opts) => {
    return fn(opts);
  };
}

export function createEmbeddingBasedScorer<TInput extends object = {}>(
  fn: (opts: { embedding: EmbeddingModel } & TInput) => Scorer
): EmbeddingBasedScorer<TInput> {
  return (opts) => {
    return fn(opts);
  };
}

import type { Evalite } from "../types.js";
import type { EmbeddingModel, LanguageModel } from "ai";

type Scorer = Evalite.Scorer<Evalite.EvaluationSample, string, unknown>;

export type LLMBasedScorer = (opts: { model: LanguageModel }) => Scorer;

export type EmbeddingBasedScorer = (opts: {
  embedding: EmbeddingModel;
}) => Scorer;

export function createLLMBasedScorer(
  fn: (opts: { model: LanguageModel }) => Scorer
): LLMBasedScorer {
  return (opts) => {
    return fn(opts);
  };
}

export function createEmbeddingBasedScorer(
  fn: (opts: { embedding: EmbeddingModel }) => Scorer
): EmbeddingBasedScorer {
  return (opts) => {
    return fn(opts);
  };
}

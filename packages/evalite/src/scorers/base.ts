import { createScorer } from "../create-scorer.js";
import type { Evalite } from "../types.js";

export function createLLMScorer<
  TExpected extends object,
  TConfig extends
    Evalite.Scorers.LLMBasedScorerBaseConfig = Evalite.Scorers.LLMBasedScorerBaseConfig,
>(opts: Evalite.Scorers.LLMBasedScorerFactoryOpts<TExpected>) {
  return function (config: TConfig) {
    return createScorer<
      Evalite.Scorers.SingleOrMultiTurnInput,
      string,
      TExpected
    >({
      name: opts.name,
      description: opts.description,
      scorer: (input) => opts.scorer({ ...input, model: config.model }),
    });
  };
}

export function createEmbeddingScorer<
  TExpected extends object,
  TConfig extends
    Evalite.Scorers.EmbeddingBasedScorerBaseConfig = Evalite.Scorers.EmbeddingBasedScorerBaseConfig,
>(opts: Evalite.Scorers.EmbeddingBasedScorerFactoryOpts<TExpected>) {
  return function (config: TConfig) {
    return createScorer<
      Evalite.Scorers.SingleOrMultiTurnInput,
      string,
      TExpected
    >({
      name: opts.name,
      description: opts.description,
      scorer: (input) =>
        opts.scorer({ ...input, embeddingModel: config.embeddingModel }),
    });
  };
}

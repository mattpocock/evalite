import { createScorer } from "../create-scorer.js";
import type { Evalite } from "../types.js";

export function createLLMScorer<
  TExpected extends object,
  TConfig extends {} = {},
>(opts: Evalite.Scorers.LLMBasedScorerFactoryOpts<TExpected, TConfig>) {
  return function (config: TConfig & Evalite.Scorers.LLMBasedScorerBaseConfig) {
    return createScorer<
      string,
      Evalite.Scorers.SingleOrMultiTurnOutput,
      TExpected
    >({
      name: opts.name,
      description: opts.description,
      scorer: (input) => opts.scorer({ ...input, ...config }),
    });
  };
}

export function createEmbeddingScorer<
  TExpected extends object,
  TConfig extends {} = {},
>(opts: Evalite.Scorers.EmbeddingBasedScorerFactoryOpts<TExpected, TConfig>) {
  return function (
    config: TConfig & Evalite.Scorers.EmbeddingBasedScorerBaseConfig
  ) {
    return createScorer<
      string,
      Evalite.Scorers.SingleOrMultiTurnOutput,
      TExpected
    >({
      name: opts.name,
      description: opts.description,
      scorer: (input) => opts.scorer({ ...input, ...config }),
    });
  };
}

export function createSimpleScorer<
  TExpected extends object,
  TConfig extends object = {},
>(opts: Evalite.Scorers.SimpleScorerFactoryOpts<TExpected, TConfig>) {
  return function (config: TConfig = {} as TConfig) {
    return createScorer<
      string,
      Evalite.Scorers.SingleOrMultiTurnOutput,
      TExpected
    >({
      name: opts.name,
      description: opts.description,
      scorer: (input) => opts.scorer({ ...input, ...config }),
    });
  };
}

export function createLLMAndEmbeddingScorer<
  TExpected extends object,
  TConfig extends {} = {},
>(
  opts: Evalite.Scorers.LLMAndEmbeddingBasedScorerFactoryOpts<
    TExpected,
    TConfig
  >
) {
  return function (
    config: TConfig & Evalite.Scorers.LLMAndEmbeddingBasedScorerBaseConfig
  ) {
    return createScorer<
      string,
      Evalite.Scorers.SingleOrMultiTurnOutput,
      TExpected
    >({
      name: opts.name,
      description: opts.description,
      scorer: (input) => opts.scorer({ ...input, ...config }),
    });
  };
}

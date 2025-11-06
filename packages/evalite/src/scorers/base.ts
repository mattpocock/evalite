import { createScorer } from "../create-scorer.js";
import type { Evalite } from "../types.js";

/**
 * Helper for creating scorers that need an AI
 * model to judge outputs.
 *
 * Use this when your scorer needs to make
 * subjective judgments requiring language
 * understanding (like checking faithfulness).
 */
export function createLLMScorer<
  TExpected extends object,
  TConfig extends object = {},
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

/**
 * Helper for creating scorers that need to
 * convert text to numerical representations for
 * comparison.
 *
 * Use this for semantic similarity comparisons.
 */
export function createEmbeddingScorer<
  TExpected extends object,
  TConfig extends object = {},
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

/**
 * Helper for creating basic scorers that don't
 * need any AI models.
 *
 * Use this for simple checks like string
 * matching or numeric comparisons.
 */
export function createSimpleScorer<
  TExpected extends object,
  TConfig extends object | void = void,
>(opts: Evalite.Scorers.SimpleScorerFactoryOpts<TExpected, TConfig>) {
  return function (config: TConfig) {
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

/**
 * Helper for creating scorers that need both an
 * AI model for judgments and embeddings for
 * similarity comparisons.
 *
 * Use this for complex scorers like
 * answerCorrectness that combine multiple
 * evaluation approaches.
 */
export function createLLMAndEmbeddingScorer<
  TExpected extends object,
  TConfig extends object = {},
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

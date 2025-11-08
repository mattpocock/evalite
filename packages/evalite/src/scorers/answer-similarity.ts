import { cosineSimilarity, embedMany, type EmbeddingModel } from "ai";
import type { Evalite } from "../types.js";

/**
 * Checks how similar your AI's answer is to the
 * expected answer in meaning (not exact words).
 *
 * This is a "soft" comparison - it doesn't
 * require exact word matches. Instead, it
 * measures how close the meanings are.
 *
 * Good for cases where multiple phrasings are
 * valid.
 *
 * **When to use**: When there are many valid ways to
 * express the correct answer, and you want to
 * allow flexibility in phrasing.
 *
 * **When NOT to use**: When you need to verify
 * specific facts (use answerCorrectness or
 * faithfulness), or need exact matches (use
 * exactMatch).
 *
 * Based on the SAS paper:
 * https://arxiv.org/pdf/2108.06130.pdf
 *
 * @param opts.answer - The AI's answer to evaluate
 * @param opts.reference - Reference answer for comparison (complete, accurate answer)
 * @param opts.embeddingModel - Embedding model to use for semantic similarity
 */
export async function answerSimilarity(
  opts: Evalite.Scorers.AnswerSimilarityOpts
) {
  const { embeddings } = await embedMany({
    model: opts.embeddingModel,
    values: [opts.reference, opts.answer],
  });

  const [referenceEmbedding, responseEmbedding] = embeddings;

  if (!referenceEmbedding || !responseEmbedding) {
    return {
      name: "Answer Similarity",
      description:
        "Evaluates the similarity of the model's response to the expected answer",
      score: 0,
    };
  }

  const score = cosineSimilarity(referenceEmbedding, responseEmbedding);
  return {
    name: "Answer Similarity",
    description:
      "Evaluates the similarity of the model's response to the expected answer",
    score,
  };
}

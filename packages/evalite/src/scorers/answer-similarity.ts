import type { Evalite } from "../types.js";
import { createEmbeddingScorer } from "./base.js";
import { cosineSimilarity, embedMany } from "ai";

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
 * - `expected.reference` (required): Reference answer
 * for comparison. Complete, accurate answer to
 * input question.
 *
 * Based on the SAS paper:
 * https://arxiv.org/pdf/2108.06130.pdf
 */
export const answerSimilarity =
  createEmbeddingScorer<Evalite.Scorers.AnswerSimilarityExpected>({
    name: "Answer Similarity",
    description:
      "Evaluates the similarity of the model's response to the expected answer",
    scorer: async ({ output, expected, embeddingModel }) => {
      if (!expected?.reference) throw new Error("No reference answer provided");

      const { embeddings } = await embedMany({
        model: embeddingModel,
        values: [expected.reference, output],
      });

      const [referenceEmbedding, responseEmbedding] = embeddings;

      if (!referenceEmbedding || !responseEmbedding) {
        return { score: 0 };
      }

      const score = cosineSimilarity(referenceEmbedding, responseEmbedding);
      return {
        score,
      };
    },
  });

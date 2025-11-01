import type { Evalite } from "../types.js";
import { createEmbeddingScorer } from "./base.js";
import { cosineSimilarity, embedMany } from "ai";

/**
 * AnswerSimilarity metric scores the semantic similarity between
 * a ground truth answer and a generated answer.
 *
 * The metric works by:
 * 1. Embedding both the ground truth answer and the generated answer using the provided embedding model
 * 2. Normalizing the embeddings to unit vectors
 * 3. Computing cosine similarity between the normalized embeddings
 *
 * Based on the SAS paper: https://arxiv.org/pdf/2108.06130.pdf
 */
export const answerSimilarity =
  createEmbeddingScorer<Evalite.Scorers.AnswerSimilarityExpected>({
    name: "Answer Similarity",
    description:
      "Evaluates the similarity of the model's response to the expected answer",
    scorer: async ({ output, expected, embeddingModel }) => {
      if (!expected?.referenceAnswer)
        throw new Error("No reference answer provided");

      const { embeddings } = await embedMany({
        model: embeddingModel,
        values: [expected.referenceAnswer, output],
      });

      const [referenceEmbedding, responseEmbedding] = embeddings;

      if (!referenceEmbedding || !responseEmbedding) {
        return { score: 0 };
      }

      const score = cosineSimilarity(referenceEmbedding, responseEmbedding);
      return {
        score,
        metadata: `Answer similarity score: ${score.toFixed(2)}`,
      };
    },
  });

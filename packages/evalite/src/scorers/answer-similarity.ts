import { createEmbeddingBasedScorer } from "./base.js";
import { createScorer } from "../create-scorer.js";
import { cosineSimilarity, embedMany } from "ai";
import { failedToScore, isSingleTurnSample } from "./utils.js";

/**
 * AnswerSimilarity metric scores the semantic similarity between
 * a ground truth answer and a generated answer.
 *
 * The metric works by:
 * 1. Embedding both the ground truth answer and the generated answer using the provided embedding model
 * 2. Normalizing the embeddings to unit vectors
 * 3. Computing cosine similarity between the normalized embeddings
 * 4. Optionally applying a threshold for binary output
 *
 * Based on the SAS paper: https://arxiv.org/pdf/2108.06130.pdf
 */
export const answerSimilarity = createEmbeddingBasedScorer<{
  threshold?: number;
}>(({ embedding, threshold }) => {
  return createScorer({
    name: "Answer Similarity",
    description:
      "Evaluates the similarity of the model's response to the expected answer",
    async scorer({ input, output, expected }) {
      if (!isSingleTurnSample(input))
        return failedToScore(
          "Answer Similarity scorer only supports single turn samples"
        );

      if (!expected) return failedToScore("No expected answer provided");

      const score = await computeScore(expected, output);
      return {
        score,
        metadata: reason(score),
      };
    },
  });

  function reason(score: number) {
    if (threshold === undefined)
      return `Answer similarity score: ${score.toFixed(2)}`;
    return `Answer similarity ${score >= threshold ? "meets" : "does not meet"} the threshold of ${threshold.toFixed(2)}`;
  }

  async function computeScore(reference: string, response: string) {
    const { embeddings } = await embedMany({
      model: embedding,
      values: [reference, response],
    });

    const [referenceEmbedding, responseEmbedding] = embeddings;

    if (!referenceEmbedding || !responseEmbedding) {
      return 0;
    }

    const similarity = cosineSimilarity(referenceEmbedding, responseEmbedding);

    if (threshold === undefined) return similarity;

    return similarity >= threshold ? 1 : 0;
  }
});

import { createEmbeddingBasedScorer } from "./base.js";
import { createScorer } from "../create-scorer.js";
import { cosineSimilarity, embedMany } from "ai";
import { isSingleTurnSample } from "./utils.js";

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
export const answerSimilarity = createEmbeddingBasedScorer(({ embedding }) => {
  return createScorer({
    name: "Answer Similarity",
    description:
      "Evaluates the similarity of the model's response to the expected answer",
    async scorer({ input, output, expected }) {
      if (!isSingleTurnSample(input))
        throw new Error(
          "Answer Similarity scorer only supports single turn samples"
        );

      if (!expected) throw new Error("No expected answer provided");

      const score = await computeScore(expected, output);
      return {
        score,
        metadata: `Answer similarity score: ${score.toFixed(2)}`,
      };
    },
  });

  async function computeScore(reference: string, response: string) {
    const { embeddings } = await embedMany({
      model: embedding,
      values: [reference, response],
    });

    const [referenceEmbedding, responseEmbedding] = embeddings;

    if (!referenceEmbedding || !responseEmbedding) {
      return 0;
    }

    return cosineSimilarity(referenceEmbedding, responseEmbedding);
  }
});

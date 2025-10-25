import { openai } from "@ai-sdk/openai";
import { evalite } from "evalite";
import { answerSimilarity } from "evalite/scorers";

evalite("Answer Similarity", {
  data: [
    {
      input: "What is the capital of France?",
      expected: {
        referenceAnswer: "Paris is the capital of France.",
      },
    },
  ],
  task: async () => {
    return "The capital city of France is Paris.";
  },
  scorers: [
    answerSimilarity({
      embeddingModel: openai.embedding("text-embedding-3-small"),
    }),
  ],
});

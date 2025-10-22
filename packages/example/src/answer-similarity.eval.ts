import { openai } from "@ai-sdk/openai";
import { evalite } from "evalite";
import { answerSimilarity } from "evalite/scorers";

evalite("Answer Similarity", {
  data: [
    {
      input: {
        query: "What is the capital of France?",
        reference: "Paris is the capital of France.",
      },
    },
  ],
  task: async () => {
    return "The capital city of France is Paris.";
  },
  scorers: [
    answerSimilarity({
      embedding: openai.embedding("text-embedding-3-small"),
    }),
  ],
});

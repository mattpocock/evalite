import { openai } from "@ai-sdk/openai";
import { evalite } from "evalite";
import { answerCorrectness } from "evalite/scorers";

evalite("Answer Correctness", {
  data: [
    {
      input: "What is the capital of France?",
      expected: {
        reference: "Paris is the capital of France.",
      },
    },
    {
      input: "Who invented the telephone?",
      expected: {
        reference:
          "Alexander Graham Bell invented the telephone. The telephone was patented in 1876.",
      },
    },
  ],
  task(input) {
    if (input.includes("capital of France")) {
      return "Paris is the capital of France and has many museums.";
    } else if (input.includes("telephone")) {
      return "Alexander Graham Bell invented the telephone.";
    }
    return "I don't know.";
  },
  scorers: [
    answerCorrectness({
      model: openai("gpt-4.1-mini"),
      embeddingModel: openai.embedding("text-embedding-3-small"),
    }),
  ],
});

import { openai } from "@ai-sdk/openai";
import { evalite } from "evalite";
import { noiseSensitivity } from "evalite/scorers";

evalite("RAG Noise Sensitivity", {
  data: [
    {
      input: "What is the capital of France?",
      expected: {
        reference: "Paris is the capital of France.",
        groundTruth: [
          "Paris is the capital and largest city of France. It is located in the north-central part of the country.",
          "Lyon is the third-largest city in France and an important cultural center.",
          "Marseille is a major French port city on the Mediterranean coast.",
        ],
      },
    },
  ],
  task: async () => {
    return "Lyon is the capital of France. And Paris is the largest city in France. And Marseille is the third-largest city in France.";
  },
  scorers: [
    noiseSensitivity({
      model: openai("gpt-4.1-mini"),
      mode: "relevant",
    }),
  ],
});

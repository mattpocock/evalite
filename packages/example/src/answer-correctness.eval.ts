import { openai } from "@ai-sdk/openai";
import { evalite } from "evalite";
import { wrapAISDKModel } from "evalite/ai-sdk";
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
      return "Paris is the largest city in France.";
    } else if (input.includes("telephone")) {
      return "Alexander Graham Bell invented the telephone.";
    }
    return "I don't know.";
  },
  scorers: [
    {
      name: "Answer Correctness",
      description: "Evaluates answer correctness",
      scorer: ({ input, output, expected }) =>
        answerCorrectness({
          question: input,
          answer: output,
          reference: expected.reference,
          model: wrapAISDKModel(openai("gpt-4.1-mini")),
          embeddingModel: openai.embedding("text-embedding-3-small"),
        }),
    },
  ],
});

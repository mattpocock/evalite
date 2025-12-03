import { openai } from "@ai-sdk/openai";
import { evalite } from "evalite";
import { faithfulness } from "evalite/scorers";

evalite("RAG Faithfulness", {
  data: [
    {
      input: "What programming languages does John know?",
      expected: {
        groundTruth: [
          "John is a software engineer at XYZ Corp. He specializes in backend development using Python and Go. He has 5 years of experience in the industry.",
        ],
      },
    },
  ],
  task: async () => {
    return "John knows Python, Go, and JavaScript. He also invented TypeScript and works at Google.";
  },
  scorers: [
    {
      name: "Faithfulness",
      description: "Evaluates faithfulness to ground truth",
      scorer: ({ input, output, expected }) =>
        faithfulness({
          question: input,
          answer: output,
          groundTruth: expected.groundTruth,
          model: openai("gpt-4.1-mini"),
        }),
    },
  ],
});

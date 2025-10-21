import { openai } from "@ai-sdk/openai";
import { evalite } from "evalite";
import { faithfulness } from "evalite/scorers";

evalite("RAG Faithfulness", {
  data: [
    {
      input: {
        query: "What programming languages does John know?",
        retrievedContexts: [
          "John is a software engineer at XYZ Corp. He specializes in backend development using Python and Go. He has 5 years of experience in the industry.",
        ],
      },
    },
  ],
  task: async () => {
    return "John knows Python, Go, and JavaScript. He also invented TypeScript and works at Google.";
  },
  scorers: [
    faithfulness({
      model: openai("gpt-4.1-mini"),
    }),
  ],
});

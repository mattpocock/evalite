import type { UIMessage } from "ai";
import { evalite } from "evalite";

evalite("Long", {
  data: async () => [
    {
      input: [
        {
          id: "1",
          parts: [
            {
              type: "text",
              text: "What is the capital of France?",
            },
          ],
          role: "user",
        },
        {
          id: "2",
          parts: [
            {
              type: "text",
              text: "Paris is the capital of France and has many museums.",
            },
          ],
          role: "assistant",
        },
        {
          id: "3",
          parts: [
            {
              type: "text",
              text: "What is the capital of Germany?",
            },
          ],
          role: "user",
        },
      ] satisfies UIMessage[],
      expected: `Berlin`,
    },
  ],
  task: async (input) => {
    return "Berlin";
  },
  scorers: [],
});

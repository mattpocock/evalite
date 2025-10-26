import { evalite } from "evalite";
import { setTimeout } from "timers/promises";

evalite("Long", {
  data: async () => [
    {
      input: `What's the capital of France?`,
      expected: `Paris`,
    },
    {
      input: `What's the capital of Germany?`,
      expected: `Berlin`,
    },
  ],
  task: async (_input) => {
    await setTimeout(2000);
    return "Paris";
  },
  scorers: [],
});

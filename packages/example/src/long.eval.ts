import { evaluhealth } from "evaluhealth";
import { setTimeout } from "timers/promises";

evaluhealth("Long", {
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
  task: async (input) => {
    await setTimeout(2000);
    return "Paris";
  },
  scorers: [],
});

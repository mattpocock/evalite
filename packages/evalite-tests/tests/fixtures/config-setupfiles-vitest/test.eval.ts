import { evalite } from "evalite";
import { Levenshtein } from "autoevals";

evalite("Vitest Setup Test", {
  data: () => [
    {
      input: "test",
      expected: process.env.VITEST_SETUP_VAR,
    },
  ],
  task: async (input) => {
    return process.env.VITEST_SETUP_VAR as string;
  },
  scorers: [Levenshtein],
});

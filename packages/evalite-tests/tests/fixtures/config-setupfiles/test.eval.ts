import { evalite } from "evalite";
import { Levenshtein } from "autoevals";

evalite("Env Var Test", {
  data: () => [
    {
      input: "test",
      expected: process.env.TEST_ENV_VAR,
    },
  ],
  task: async (_input) => {
    return process.env.TEST_ENV_VAR as string;
  },
  scorers: [Levenshtein],
});

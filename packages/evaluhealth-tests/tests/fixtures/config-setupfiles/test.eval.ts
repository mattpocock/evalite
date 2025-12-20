import { evaluhealth } from "evaluhealth";
import { Levenshtein } from "autoevals";

evaluhealth("Env Var Test", {
  data: () => [
    {
      input: "test",
      expected: process.env.TEST_ENV_VAR,
    },
  ],
  task: async (input) => {
    return process.env.TEST_ENV_VAR as string;
  },
  scorers: [Levenshtein],
});

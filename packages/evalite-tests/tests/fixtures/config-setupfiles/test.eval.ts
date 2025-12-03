import { evalite } from "evalite";

evalite("Env Var Test", {
  data: () => [
    {
      input: "test",
      expected: process.env.TEST_ENV_VAR,
    },
  ],
  task: async (input) => {
    return process.env.TEST_ENV_VAR as string;
  },
  scorers: [
    {
      name: "Pass",
      scorer: () => ({ score: 1 }),
    },
  ],
});

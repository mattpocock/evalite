import { evalite } from "evalite";

evalite("Precedence Test", {
  data: () => [
    {
      input: "test",
      expected: "evalite",
    },
  ],
  task: async (input) => {
    return process.env.SETUP_ORDER as string;
  },
  scorers: [
    {
      name: "Pass",
      scorer: () => ({ score: 1 }),
    },
  ],
});

import { evalite } from "evalite";

evalite("Eval 2", {
  data: () => [
    { input: "a", expected: 0.5 },
    { input: "b", expected: 0.5 },
    { input: "c", expected: 0.5 },
  ],
  task: async (input) => {
    return 0.5;
  },
  scorers: [
    {
      name: "match",
      scorer: ({ output, expected }) => {
        return output === expected ? 1 : 0;
      },
    },
  ],
});

import { evalite } from "evalite";

evalite("Eval 3", {
  data: () => [
    { input: "x", expected: true },
    { input: "y", expected: false },
    { input: "z", expected: false },
    { input: "w", expected: false },
  ],
  task: async (input) => {
    return input === "x";
  },
  scorers: [
    {
      name: "correct",
      scorer: ({ output, expected }) => {
        return output === expected ? 1 : 0;
      },
    },
  ],
});

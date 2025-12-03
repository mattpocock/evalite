import { evalite } from "evalite";
import { setTimeout } from "node:timers/promises";

evalite("Much Data", {
  data: () => {
    return [
      {
        input: "first",
        expected: "abcdef",
      },
      {
        input: "second",
        expected: "abcdef",
      },
      {
        input: "third",
        expected: "abcdef",
      },
      {
        input: "fourth",
        expected: "abcdef",
      },
    ];
  },
  task: async (input) => {
    // To test whether duration is calculated properly
    await setTimeout(10);
    return input + "def";
  },
  scorers: [
    {
      name: "Pass",
      scorer: () => ({ score: 1 }),
    },
  ],
});

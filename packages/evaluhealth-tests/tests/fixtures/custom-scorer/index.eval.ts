import { createScorer, evaluhealth } from "evaluhealth";
import { setTimeout } from "node:timers/promises";

evaluhealth("Index", {
  data: () => {
    return [
      {
        input: "abc",
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
    createScorer({
      name: "Is Same",
      scorer: ({ output, expected }) => {
        return output === expected ? 1 : 0;
      },
    }),
  ],
});

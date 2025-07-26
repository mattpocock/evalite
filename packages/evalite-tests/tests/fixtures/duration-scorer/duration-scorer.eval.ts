import { createScorer, evalite } from "evalite";
import { setTimeout } from "node:timers/promises";

evalite("Duration Scorer", {
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
      name: "Duration Scorer",
      scorer: ({ output, expected, duration}) => {
        return duration! >= 9  ? 1 : 0;
      },
    }),
  ],
});

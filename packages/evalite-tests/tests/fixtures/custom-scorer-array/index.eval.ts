import { createScorer, evalite } from "evalite";
import { setTimeout } from "node:timers/promises";

evalite("Index", {
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
      name: "Multiple Criteria",
      scorer: ({ output, expected }) => {
        return [
          {
            score: output === expected ? 1 : 0,
            metadata: { criterion: "Is Same" },
          },
          {
            score: output.length === 6 ? 1 : 0,
            metadata: { criterion: "Length is 6" },
          },
        ];
      },
    }),
    ({ output, expected }) => {
      return [
        {
          name: "Inline Scorer 1",
          score: output === expected ? 1 : 0,
          description: "Inline Same",
        },
        {
          name: "Inline Scorer 2",
          score: 0.5,
          description: "Inline Half",
        },
      ];
    },
  ],
});

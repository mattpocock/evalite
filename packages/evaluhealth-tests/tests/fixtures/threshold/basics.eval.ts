import { createScorer, evaluhealth } from "evaluhealth";

evaluhealth("Basics", {
  data: () => {
    return [
      {
        input: "abc",
        expected: "abcdef",
      },
    ];
  },
  task: async (input) => {
    return input + "def";
  },
  scorers: [
    createScorer({
      name: "XYZ",
      scorer: () => 0.2,
    }),
  ],
});

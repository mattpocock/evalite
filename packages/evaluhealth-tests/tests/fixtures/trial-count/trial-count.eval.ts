import { evaluhealth } from "evaluhealth";

evaluhealth("Trial Count Test", {
  data: () => [
    { input: "a", expected: "a" },
    { input: "b", expected: "b" },
  ],
  task: async (input) => {
    return input;
  },
  scorers: [
    {
      name: "Match",
      scorer: ({ input, output }) => (input === output ? 1 : 0),
    },
  ],
  trialCount: 3,
});

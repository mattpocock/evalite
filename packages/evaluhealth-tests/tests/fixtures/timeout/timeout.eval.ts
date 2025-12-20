import { createScorer, evaluhealth } from "evaluhealth";

evaluhealth("Timeout", {
  data: () => {
    return [
      {
        input: "test",
        expected: "this should timeout",
      },
    ];
  },
  task: async (input) => {
    // This promise will never resolve, simulating a timeout
    return new Promise((resolve) => {
      // Never calling resolve() to simulate a hang/timeout
    });
  },
  scorers: [
    createScorer({
      name: "Should Timeout",
      scorer: () => 1.0,
    }),
  ],
});

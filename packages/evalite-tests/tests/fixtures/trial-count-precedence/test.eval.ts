import { evalite } from "evalite";

evalite("Precedence Test", {
  data: () => [{ input: "a", expected: "a" }],
  task: async (input) => input,
  scorers: [],
  trialCount: 4, // Should override config's trialCount: 2
});

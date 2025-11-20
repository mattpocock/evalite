import { evalite } from "evalite";

/**
 * Simple test eval to validate Braintrust storage integration
 */
evalite("Braintrust Storage Test", {
  data: () => [
    { input: "Hello", expected: "Hello, World!" },
    { input: "Goodbye", expected: "Goodbye, World!" },
    { input: "Test", expected: "Test, World!" },
  ],
  task: async (input) => {
    // Simple task that adds ", World!" to the input
    return `${input}, World!`;
  },
  scorers: [
    (input, output, expected) => {
      return {
        name: "exact_match",
        score: output === expected ? 1 : 0,
      };
    },
  ],
});

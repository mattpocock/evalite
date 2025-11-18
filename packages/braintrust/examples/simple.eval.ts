import { evalite } from "evalite";

/**
 * Simple example demonstrating Braintrust storage integration.
 * This eval tests a basic string concatenation task.
 */
evalite("Braintrust Storage Example", {
  data: () => [
    { input: "Hello", expected: "Hello, World!" },
    { input: "Goodbye", expected: "Goodbye, World!" },
    { input: "Testing", expected: "Testing, World!" },
  ],
  task: async (input) => {
    // Simulate a simple LLM task
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

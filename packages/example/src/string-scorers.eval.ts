import { evalite } from "evalite";
import { contains, exactMatch } from "evalite/scorers";

evalite("Exact Match", {
  data: [
    {
      input: "What is the capital of France?",
      expected: {
        reference: "Paris is the capital of France",
      },
    },
  ],
  task: async (input) => {
    return "Paris is the capital of France";
  },
  scorers: [
    {
      name: "Exact Match",
      description: "Checks exact match",
      scorer: ({ output, expected }) =>
        exactMatch({
          actual: output,
          expected: expected.reference,
        }),
    },
  ],
});

evalite("Contains", {
  data: [
    {
      input: "What is the capital of France?",
      expected: {
        reference: "Paris",
      },
    },
  ],
  task: async (input) => {
    return "Paris is the capital of France";
  },
  scorers: [
    {
      name: "Contains",
      description: "Checks if output contains substring",
      scorer: ({ output, expected }) =>
        contains({
          actual: output,
          expected: expected.reference,
        }),
    },
  ],
});

import { evalite } from "evalite";
import { contains, exactMatch, levenshtein } from "evalite/scorers";

evalite("Exact Match", {
  data: [
    {
      input: "What is the capital of France?",
      expected: {
        reference: "Paris is the capital of France",
      },
    },
  ],
  task: async () => {
    return "Paris is the capital of France";
  },
  scorers: [
    {
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
      scorer: ({ output, expected }) =>
        contains({
          actual: output,
          expected: expected.reference,
        }),
    },
  ],
});

evalite("Levenshtein", {
  data: [
    {
      input: "What is the capital of France?",
      expected: {
        reference: "Paris",
      },
    },
    {
      input: "What is 2+2?",
      expected: {
        reference: "4",
      },
    },
  ],
  task: async (input) => {
    if (input.includes("France")) {
      return "Pari"; // Typo - missing 's', should score 0.8
    }
    return "Four"; // Wrong but similar, should score 0.0
  },
  scorers: [
    {
      scorer: ({ output, expected }) =>
        levenshtein({
          actual: output,
          expected: expected.reference,
        }),
    },
  ],
});

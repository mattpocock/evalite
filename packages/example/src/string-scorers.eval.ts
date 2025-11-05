import { evalite } from "evalite";
import { exactMatch, contains } from "evalite/scorers";

evalite("Exact Match", {
  data: [
    {
      input: "What is the capital of France?",
      expected: {
        expected: "Paris is the capital of France",
      },
    },
  ],
  task: async (input) => {
    return "Paris is the capital of France";
  },
  scorers: [exactMatch()],
});

evalite("Contains", {
  data: [
    {
      input: "What is the capital of France?",
      expected: {
        expected: "Paris",
      },
    },
  ],
  task: async (input) => {
    return "Paris is the capital of France";
  },
  scorers: [contains()],
});

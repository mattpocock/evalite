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
  scorers: [exactMatch()],
  task: async (input) => {
    return "Paris is the capital of France";
  },
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
  scorers: [contains()],
});

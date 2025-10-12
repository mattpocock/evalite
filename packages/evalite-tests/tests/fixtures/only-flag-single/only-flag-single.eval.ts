import { evalite } from "evalite";
import { Levenshtein } from "autoevals";

evalite("Only Flag Single", {
  data: () => {
    return [
      {
        input: "a",
        expected: "a",
      },
      {
        input: "b",
        expected: "b",
      },
      {
        input: "c",
        expected: "c",
        only: true,
      },
    ];
  },
  task: async (input) => {
    return input;
  },
  scorers: [Levenshtein],
});

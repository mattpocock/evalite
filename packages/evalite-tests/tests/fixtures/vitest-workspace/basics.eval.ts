import { evalite } from "evalite";
import { Levenshtein } from "autoevals";

evalite("Basics", {
  data: () => {
    return [
      {
        input: "abc",
        expected: "abcdef",
      },
    ];
  },
  task: async (input) => {
    return input + "def";
  },
  scorers: [Levenshtein],
});

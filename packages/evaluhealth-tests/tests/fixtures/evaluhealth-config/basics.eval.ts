import { evaluhealth } from "evaluhealth";
import { Levenshtein } from "autoevals";

evaluhealth("Basics", {
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

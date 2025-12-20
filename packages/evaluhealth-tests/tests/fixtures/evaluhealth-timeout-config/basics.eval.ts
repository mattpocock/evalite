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
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return input + "def";
  },
  scorers: [Levenshtein],
});

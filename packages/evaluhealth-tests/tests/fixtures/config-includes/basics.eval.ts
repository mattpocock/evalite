import { evaluhealth } from "evaluhealth";
import { Levenshtein } from "autoevals";
import { setTimeout } from "node:timers/promises";

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
    // To test whether duration is calculated properly
    await setTimeout(10);
    return input + "def";
  },
  scorers: [Levenshtein],
});

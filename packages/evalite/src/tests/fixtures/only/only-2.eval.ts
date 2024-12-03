import { evalite } from "../../../index.js";
import { reportTrace } from "../../../traces.js";
import { Levenshtein } from "autoevals";

evalite("Also Not Run", {
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

import { Levenshtein } from "autoevals";
import { evalite } from "../../../index.js";

evalite.only("Only", {
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

evalite("Not Run", {
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

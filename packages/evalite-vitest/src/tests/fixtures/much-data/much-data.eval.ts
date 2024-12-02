import { evalite, Levenshtein } from "../../../index.js";
import { setTimeout } from "node:timers/promises";

evalite("Much Data", {
  data: () => {
    return [
      {
        input: "first",
        expected: "abcdef",
      },
      {
        input: "second",
        expected: "abcdef",
      },
      {
        input: "third",
        expected: "abcdef",
      },
      {
        input: "fourth",
        expected: "abcdef",
      },
    ];
  },
  task: [import("./muchData.js"), "basics"],
  scorers: [Levenshtein],
});

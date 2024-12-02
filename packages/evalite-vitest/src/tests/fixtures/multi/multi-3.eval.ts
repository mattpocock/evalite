import { evalite, Levenshtein } from "../../../index.js";
import { setTimeout } from "node:timers/promises";

evalite("Multiple 3", {
  data: () => {
    return [
      {
        input: "abc",
        expected: "abcdef",
      },
    ];
  },
  task: [import("./multi.js"), "multi"],
  scorers: [Levenshtein],
});

evalite("Multiple 4", {
  data: () => {
    return [
      {
        input: "abc",
        expected: "abcdef",
      },
    ];
  },
  task: [import("./multi.js"), "multi"],
  scorers: [Levenshtein],
});

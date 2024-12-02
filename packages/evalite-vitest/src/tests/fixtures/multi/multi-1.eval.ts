import { evalite, Levenshtein } from "../../../index.js";
import { setTimeout } from "node:timers/promises";

evalite("Multiple 1", {
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

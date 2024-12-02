import { evalite, Levenshtein } from "../../../index.js";
import { setTimeout } from "node:timers/promises";

evalite("Basics", {
  data: () => {
    return [
      {
        input: "abc",
        expected: "abcdef",
      },
    ];
  },
  task: [import("./basics.js"), "basics"],
  scorers: [Levenshtein],
});

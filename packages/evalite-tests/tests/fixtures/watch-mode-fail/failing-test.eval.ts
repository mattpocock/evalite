import { evalite } from "evalite";
import { Levenshtein } from "autoevals";
import { setTimeout } from "timers/promises";

evalite("Failing", {
  data: () => {
    return [
      {
        input: "abc",
        expected: "abc",
      },
    ];
  },
  task: async (input) => {
    await setTimeout(10);
    throw new Error("This is a failing test");
  },
  scorers: [Levenshtein],
});

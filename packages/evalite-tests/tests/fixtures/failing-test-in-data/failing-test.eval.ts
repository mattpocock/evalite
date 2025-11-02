import { evalite } from "evalite";
import { Levenshtein } from "autoevals";
import { setTimeout } from "timers/promises";

evalite("Failing In Data", {
  data: () => {
    throw new Error("This is a failing test");
  },
  task: async (input) => {
    await setTimeout(10);
    return "def";
  },
  scorers: [Levenshtein],
});

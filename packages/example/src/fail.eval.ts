import { Factuality, Levenshtein } from "autoevals";
import { evalite } from "evalite";
import { setTimeout } from "node:timers/promises";

evalite("Failure", {
  data: async () => [
    {
      input: "X",
    },
  ],
  task: async (input) => {
    await setTimeout(500);
  },

  scorers: [],
});

throw new Error("Fail");

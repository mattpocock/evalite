import { Factuality, Levenshtein } from "autoevals";
import { evaluhealth } from "evaluhealth";
import { setTimeout } from "node:timers/promises";

evaluhealth("Failure", {
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

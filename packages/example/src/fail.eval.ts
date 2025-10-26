import { evalite } from "evalite";
import { setTimeout } from "node:timers/promises";

evalite("Failure", {
  data: async () => [
    {
      input: "X",
    },
  ],
  task: async (_input) => {
    await setTimeout(500);
    throw new Error("Fail");
  },
  scorers: [],
});

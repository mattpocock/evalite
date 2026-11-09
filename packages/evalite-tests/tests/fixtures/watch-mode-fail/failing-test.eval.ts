import { evalite } from "evalite";
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
  scorers: [
    {
      name: "Pass",
      scorer: () => ({ score: 1 }),
    },
  ],
});

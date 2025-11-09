import { evalite } from "evalite";

evalite("Only Flag None", {
  data: () => {
    return [
      {
        input: "a",
        expected: "a",
      },
      {
        input: "b",
        expected: "b",
      },
      {
        input: "c",
        expected: "c",
      },
    ];
  },
  task: async (input) => {
    return input;
  },
  scorers: [
    {
      name: "Pass",
      scorer: () => ({ score: 1 }),
    },
  ],
});

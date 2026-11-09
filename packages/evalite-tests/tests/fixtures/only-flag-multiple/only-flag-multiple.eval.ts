import { evalite } from "evalite";

evalite("Only Flag Multiple", {
  data: () => {
    return [
      {
        input: "a",
        expected: "a",
      },
      {
        input: "b",
        expected: "b",
        only: true,
      },
      {
        input: "c",
        expected: "c",
      },
      {
        input: "d",
        expected: "d",
        only: true,
      },
      {
        input: "e",
        expected: "e",
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

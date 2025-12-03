import { evalite } from "evalite";

evalite("Basics", {
  data: () => {
    return [
      {
        input: "abc",
        expected: "abcdef",
      },
    ];
  },
  task: async (input) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return input + "def";
  },
  scorers: [
    {
      name: "Pass",
      scorer: () => ({ score: 1 }),
    },
  ],
});

import { evalite } from "evalite";

evalite("Eval 1", {
  data: () => [
    { input: "test1", expected: "output1" },
    { input: "test2", expected: "wrong" },
  ],
  task: async (input) => {
    return input.replace("test", "output");
  },
  scorers: [
    {
      name: "accuracy",
      scorer: ({ output, expected }) => {
        return output === expected ? 1 : 0;
      },
    },
  ],
});

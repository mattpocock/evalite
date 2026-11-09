import { evalite } from "evalite";
import { reportTrace } from "evalite/traces";

evalite("Traces", {
  data: () => {
    return [
      {
        input: "abc",
        expected: "abcdef",
      },
    ];
  },
  task: async (input) => {
    reportTrace({
      start: 0,
      end: 100,
      output: "abcdef",
      input: [
        {
          role: "input",
          content: "abc",
        },
      ],
      usage: {
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
      },
    });
    return input + "def";
  },
  scorers: [
    {
      name: "Pass",
      scorer: () => ({ score: 1 }),
    },
  ],
});

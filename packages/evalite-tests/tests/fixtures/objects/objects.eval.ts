import { createScorer, evalite } from "evalite";

type Shape = {
  input: string;
  output: number | undefined;
};

evalite("Basics", {
  data: [
    {
      input: [
        {
          input: "abc",
          output: undefined,
        },
      ],
      expected: {
        reference: [
          {
            input: "abc",
            output: 123,
          },
        ],
      },
    },
  ],
  task: async (input) => {
    const newInput: Shape[] = [...input];
    newInput.push({
      input: "abc",
      output: 123,
    });

    return newInput;
  },
  scorers: [
    createScorer<
      object,
      object,
      {
        reference: object;
      }
    >({
      name: "Exact Match",
      scorer: ({ output, expected }) => {
        return JSON.stringify(output) === JSON.stringify(expected) ? 1 : 0;
      },
    }),
  ],
});

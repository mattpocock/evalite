import { createScorer, evaluhealth } from "evaluhealth";

type Shape = {
  input: string;
  output: number | undefined;
};

evaluhealth<Shape[], Shape[], Shape[]>("Basics", {
  data: () => {
    return [
      {
        input: [
          {
            input: "abc",
            output: undefined,
          },
        ],
        expected: [
          {
            input: "abc",
            output: 123,
          },
        ],
      },
    ];
  },
  task: async (input) => {
    const newInput = [...input];
    newInput.push({
      input: "abc",
      output: 123,
    });

    return newInput;
  },
  scorers: [
    createScorer({
      name: "Exact Match",
      scorer: ({ output, expected }) => {
        return JSON.stringify(output) === JSON.stringify(expected) ? 1 : 0;
      },
    }),
  ],
});

import { createScorer, evaluhealth } from "evaluhealth";

evaluhealth("Test Objects", {
  data: async () => {
    return [
      {
        input: {
          a: "Some extremely long string that is an issue for our system",
          b: 2,
          c: 3,
          d: 4,
        },
        expected: {
          a: "Some extremely long string that is an issue for our system",
          b: 2,
          c: 3,
        },
      },
    ];
  },
  task: async (input: any) => {
    const immutableInput = { ...input };
    delete immutableInput.d;
    return immutableInput;
  },
  scorers: [
    createScorer<object, object>({
      name: "Is Same",
      description: "Checks if the object passed is the same as expected.",
      scorer: ({ output, expected }) => {
        return JSON.stringify(output) === JSON.stringify(expected) ? 1 : 0;
      },
    }),
    {
      name: "Is Same 4",
      scorer: ({ output, expected }) => {
        return JSON.stringify(output) === JSON.stringify(expected) ? 1 : 0;
      },
    },
  ],
  columns: async ({ input, output, expected }) => {
    return [
      {
        label: "Input",
        value: input,
      },
      {
        label: "Output A",
        value: (output as any).a,
      },
      {
        label: "Output B",
        value: (output as any).b,
      },
      {
        label: "Output C",
        value: (output as any).c,
      },
    ];
  },
});

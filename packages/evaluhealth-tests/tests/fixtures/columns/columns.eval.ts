import { evaluhealth } from "evaluhealth";

evaluhealth("Columns", {
  data: () => {
    return [
      {
        input: {
          first: "abc",
        },
        expected: {
          last: 123,
        },
      },
    ];
  },
  task: async (input) => {
    return {
      last: 123,
    };
  },
  scorers: [],
  columns: async ({ input, output, expected }) => {
    return [
      {
        label: "Input First",
        value: input.first,
      },
      {
        label: "Expected Last",
        value: expected?.last,
      },
      {
        label: "Output Last",
        value: output.last,
      },
    ];
  },
});

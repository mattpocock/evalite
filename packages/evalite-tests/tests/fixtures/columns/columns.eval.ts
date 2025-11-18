import { evalite } from "evalite";

evalite("Columns", {
  data: () => {
    return [
      {
        input: {
          first: "abc",
          expected: 123,
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
  columns: async ({ input, output }) => {
    return [
      {
        label: "Input First",
        value: input.first,
      },
      {
        label: "Expected Last",
        value: input.expected,
      },
      {
        label: "Output Last",
        value: output.last,
      },
    ];
  },
});

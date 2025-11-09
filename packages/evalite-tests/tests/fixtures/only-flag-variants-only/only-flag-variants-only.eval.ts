import { evalite } from "evalite";

evalite.each([
  { name: "variant-a", input: "prefix-a-" },
  { name: "variant-b", input: "prefix-b-", only: true },
])("Only Flag Variants Only", {
  data: () => {
    return [
      {
        input: "test1",
        expected: "test1",
      },
      {
        input: "test2",
        expected: "test2",
      },
      {
        input: "test3",
        expected: "test3",
      },
    ];
  },
  task: async (input, variant) => {
    return variant + input;
  },
  scorers: [
    {
      name: "Pass",
      scorer: () => ({ score: 1 }),
    },
  ],
});

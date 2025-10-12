import { evalite } from "evalite";
import { Levenshtein } from "autoevals";

evalite.each([
  { name: "variant-a", input: "prefix-a-" },
  { name: "variant-b", input: "prefix-b-" },
])("Only Flag Variants", {
  data: () => {
    return [
      {
        input: "test1",
        expected: "test1",
      },
      {
        input: "test2",
        expected: "test2",
        only: true,
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
  scorers: [Levenshtein],
});

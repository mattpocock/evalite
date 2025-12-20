import { evaluhealth } from "evaluhealth";
import { Levenshtein } from "autoevals";

evaluhealth.each([
  { name: "Variant A", input: { suffix: "a" } },
  { name: "Variant B", input: { suffix: "b" } },
  { name: "Variant C", input: { suffix: "c" } },
])("Compare models", {
  data: () => {
    return [
      {
        input: "input",
        expected: "output",
      },
    ];
  },
  task: async (input, variant) => {
    return `output-${variant.suffix}`;
  },
  scorers: [Levenshtein],
});

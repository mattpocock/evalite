import { evalite } from "evalite";
import { Levenshtein } from "autoevals";

evalite.each({
  "Variant A": { suffix: "a" },
  "Variant B": { suffix: "b" },
  "Variant C": { suffix: "c" },
})("Compare models", {
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

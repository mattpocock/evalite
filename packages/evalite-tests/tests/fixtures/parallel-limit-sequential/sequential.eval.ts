import { evalite } from "evalite";
import { Levenshtein } from "autoevals";
import { setTimeout } from "node:timers/promises";

evalite.each(
  [
    { name: "V1", input: { id: 1 } },
    { name: "V2", input: { id: 2 } },
    { name: "V3", input: { id: 3 } },
  ],
  { parallelLimit: 1 }
)("Sequential Test", {
  data: () => {
    return [
      {
        input: "test",
        expected: "test-result",
      },
    ];
  },
  task: async (input, variant) => {
    await setTimeout(30);
    return `${input}-result-${variant.id}`;
  },
  scorers: [Levenshtein],
});

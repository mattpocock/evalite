import { evalite } from "evalite";
import { Levenshtein } from "autoevals";
import { setTimeout } from "node:timers/promises";

evalite.each(
  [
    { name: "Variant 1", input: { id: 1 } },
    { name: "Variant 2", input: { id: 2 } },
    { name: "Variant 3", input: { id: 3 } },
    { name: "Variant 4", input: { id: 4 } },
  ],
  { parallelLimit: 2 }
)("Parallel Limit Test", {
  data: () => {
    return [
      {
        input: "test",
        expected: "test-output",
      },
    ];
  },
  task: async (input, variant) => {
    // Simulate work
    await setTimeout(50);
    return `${input}-output-${variant.id}`;
  },
  scorers: [Levenshtein],
});

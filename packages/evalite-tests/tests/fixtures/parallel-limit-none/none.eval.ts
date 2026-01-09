import { evalite } from "evalite";
import { Levenshtein } from "autoevals";
import { setTimeout } from "node:timers/promises";

evalite.each([
  { name: "A", input: { id: 1 } },
  { name: "B", input: { id: 2 } },
  { name: "C", input: { id: 3 } },
])("No Limit Test", {
  data: () => {
    return [
      {
        input: "test",
        expected: "test-value",
      },
    ];
  },
  task: async (input, variant) => {
    await setTimeout(20);
    return `${input}-value-${variant.id}`;
  },
  scorers: [Levenshtein],
});

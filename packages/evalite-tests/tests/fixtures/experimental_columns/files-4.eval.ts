import { evalite } from "evalite";
import { readFileSync } from "node:fs";
import path from "node:path";

evalite("experimental_customColumns", {
  data: () => {
    return [
      {
        input: "abc",
        expected: "abcdef",
      },
    ];
  },
  task: async (input) => {
    return input + "def";
  },
  scorers: [],
  experimental_customColumns: () => {
    return [
      {
        label: "Column",
        value: readFileSync(path.join(import.meta.dirname, "test.png")),
      },
    ];
  },
});

import { evalite } from "evalite";
import { readFileSync } from "node:fs";
import path from "node:path";

evalite("FilesInInput", {
  data: () => {
    return [
      {
        input: readFileSync(path.join(import.meta.dirname, "test.png")),
        expected: readFileSync(path.join(import.meta.dirname, "test.png")),
      },
    ];
  },
  task: async (_input) => {
    return "abc" as any;
  },
  scorers: [],
});

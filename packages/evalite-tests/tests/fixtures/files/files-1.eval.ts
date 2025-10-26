import { evalite } from "evalite";
import { readFileSync } from "node:fs";
import path from "node:path";

evalite("Files", {
  data: () => {
    return [
      {
        input: "abc",
      },
    ];
  },
  task: async (_input) => {
    return readFileSync(path.join(import.meta.dirname, "test.png"));
  },
  scorers: [],
});

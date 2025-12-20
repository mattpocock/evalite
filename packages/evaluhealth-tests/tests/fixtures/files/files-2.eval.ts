import { evaluhealth } from "evaluhealth";
import { reportTrace } from "evaluhealth/traces";
import { readFileSync } from "node:fs";
import path from "node:path";

evaluhealth("FilesInInput", {
  data: () => {
    return [
      {
        input: readFileSync(path.join(import.meta.dirname, "test.png")),
        expected: readFileSync(path.join(import.meta.dirname, "test.png")),
      },
    ];
  },
  task: async (input) => {
    return "abc" as any;
  },
  scorers: [],
});

import { evaluhealth } from "evaluhealth";
import { reportTrace } from "evaluhealth/traces";
import { readFileSync } from "node:fs";
import path from "node:path";

evaluhealth("Files", {
  data: () => {
    return [
      {
        input: "abc",
      },
    ];
  },
  task: async (input) => {
    return readFileSync(path.join(import.meta.dirname, "test.png"));
  },
  scorers: [],
});

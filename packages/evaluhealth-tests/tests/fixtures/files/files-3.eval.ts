import { evaluhealth } from "evaluhealth";
import { reportTrace } from "evaluhealth/traces";
import { readFileSync } from "node:fs";
import path from "node:path";

evaluhealth("FilesWithTraces", {
  data: () => {
    return [
      {
        input: "abc",
        expected: "abcdef",
      },
    ];
  },
  task: async (input) => {
    reportTrace({
      start: 0,
      end: 3,
      input: "abc",
      output: readFileSync(path.join(import.meta.dirname, "test.png")),
    });
    return input + "def";
  },
  scorers: [],
});

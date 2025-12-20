import { evaluhealth, EvaluhealthFile, type Evaluhealth } from "evaluhealth";
import { Levenshtein } from "autoevals";
import { reportTrace, reportTraceLocalStorage } from "evaluhealth/traces";
import path from "path";

evaluhealth("Export", {
  data: () => {
    const imagePath = path.join(import.meta.dirname, "test.png");
    return [
      {
        input: EvaluhealthFile.fromPath(imagePath),
        expected: EvaluhealthFile.fromPath(imagePath),
      },
    ];
  },
  task: async (input) => {
    const imagePath = path.join(import.meta.dirname, "test.png");

    // Report a trace with file
    reportTrace({
      input: "trace input",
      output: EvaluhealthFile.fromPath(imagePath),
      start: 0,
      end: 100,
    });

    return EvaluhealthFile.fromPath(imagePath);
  },
  scorers: [],
  columns: () => {
    const imagePath = path.join(import.meta.dirname, "test.png");
    return [
      {
        label: "FileColumn",
        value: EvaluhealthFile.fromPath(imagePath),
      },
    ];
  },
});

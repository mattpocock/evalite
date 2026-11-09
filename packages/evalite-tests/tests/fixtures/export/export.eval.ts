import { evalite, EvaliteFile, type Evalite } from "evalite";
import { reportTrace, reportTraceLocalStorage } from "evalite/traces";
import path from "path";

evalite("Export", {
  data: () => {
    const imagePath = path.join(import.meta.dirname, "test.png");
    return [
      {
        input: EvaliteFile.fromPath(imagePath),
        expected: EvaliteFile.fromPath(imagePath),
      },
    ];
  },
  task: async (input) => {
    const imagePath = path.join(import.meta.dirname, "test.png");

    // Report a trace with file
    reportTrace({
      input: "trace input",
      output: EvaliteFile.fromPath(imagePath),
      start: 0,
      end: 100,
    });

    return EvaliteFile.fromPath(imagePath);
  },
  scorers: [],
  columns: () => {
    const imagePath = path.join(import.meta.dirname, "test.png");
    return [
      {
        label: "FileColumn",
        value: EvaliteFile.fromPath(imagePath),
      },
    ];
  },
});

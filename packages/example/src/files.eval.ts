import { evalite, EvaliteFile } from "evalite";
import path from "node:path";

evalite("Files", {
  data: async () => [
    {
      input: "X",
    },
  ],
  task: async (_input) => {
    return EvaliteFile.fromPath(path.join(import.meta.dirname, "test.png"));
  },
  scorers: [],
});

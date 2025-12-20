import { evaluhealth, EvaluhealthFile } from "evaluhealth";
import path from "node:path";

evaluhealth("Files", {
  data: async () => [
    {
      input: "X",
    },
  ],
  task: async (input) => {
    return EvaluhealthFile.fromPath(path.join(import.meta.dirname, "test.png"));
  },
  scorers: [],
});

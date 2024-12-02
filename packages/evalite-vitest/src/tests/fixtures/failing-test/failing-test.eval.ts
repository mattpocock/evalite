import { evalite, Levenshtein } from "../../../index.js";

evalite("Failing", {
  data: () => {
    return [
      {
        input: "abc",
      },
    ];
  },
  task: [import("./failing.js"), "failing"],
  scorers: [Levenshtein],
});

import { evalite } from "evalite";
import { Levenshtein } from "autoevals";

evalite("Precedence Test", {
  data: () => [
    {
      input: "test",
      expected: "evalite",
    },
  ],
  task: async (input) => {
    return process.env.SETUP_ORDER as string;
  },
  scorers: [Levenshtein],
});

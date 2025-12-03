import { evalite } from "evalite";

evalite("Module Error Test", {
  data: () => [{ input: "a", expected: "a" }],
  task: async (input) => {
    return input;
  },
  scorers: [],
});

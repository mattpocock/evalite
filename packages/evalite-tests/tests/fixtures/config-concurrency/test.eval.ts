import { evalite } from "evalite";

evalite("Concurrency Test", {
  data: () => [{ input: "a", expected: "a" }],
  task: async (input) => {
    return input;
  },
  scorers: [],
});

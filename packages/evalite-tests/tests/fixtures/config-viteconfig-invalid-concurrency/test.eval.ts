import { evalite } from "evalite";

evalite("Invalid Concurrency Test", {
  data: () => [{ input: "a", expected: "a" }],
  task: async (input) => input,
  scorers: [],
});

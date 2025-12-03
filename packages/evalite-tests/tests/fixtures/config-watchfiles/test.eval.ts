import { evalite } from "evalite";

evalite("WatchFiles Config Test", {
  data: () => [{ input: "hello", expected: "hello" }],
  task: async (input) => input,
  scorers: [],
});

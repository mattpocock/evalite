import { evalite } from "evalite";

evalite("Invalid Timeout Test", {
  data: () => [{ input: "a", expected: "a" }],
  task: async (input) => input,
  scorers: [],
});

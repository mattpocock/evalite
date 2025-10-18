import { evalite } from "evalite";

evalite("Config Trial Count", {
  data: () => [{ input: "x", expected: "x" }],
  task: async (input) => input,
  scorers: [],
});

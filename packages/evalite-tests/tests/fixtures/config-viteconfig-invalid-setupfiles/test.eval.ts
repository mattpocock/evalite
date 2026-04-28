import { evalite } from "evalite";

evalite("Invalid SetupFiles Test", {
  data: () => [{ input: "a", expected: "a" }],
  task: async (input) => input,
  scorers: [],
});

import { evaluhealth } from "evaluhealth";

evaluhealth("Config Trial Count", {
  data: () => [{ input: "x", expected: "x" }],
  task: async (input) => input,
  scorers: [],
});

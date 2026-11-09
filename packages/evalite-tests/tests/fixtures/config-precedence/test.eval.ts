import { evalite } from "evalite";

evalite("Config Precedence Test", {
  data: () => [{ input: "a", expected: "a" }],
  task: async (input) => {
    // Simulate a task that takes some time
    await new Promise((resolve) => setTimeout(resolve, 10));
    return input;
  },
  scorers: [],
});

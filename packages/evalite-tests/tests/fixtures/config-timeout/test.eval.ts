import { evalite } from "evalite";

evalite("Timeout Test", {
  data: () => [{ input: "a", expected: "a" }],
  task: async (input) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return input;
  },
  scorers: [],
});

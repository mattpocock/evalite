import { evalite } from "evalite";

evalite("Issue 123 Test", {
  data: async () => {
    return [
      { input: "hello", expected: "hello, world" },
      { input: "fail", expected: "hello, world" },
    ];
  },
  task: async (input) => {
    if (input === "fail") {
      throw new Error("Task failed for this input");
    }
    return input + ", world";
  },
  scorers: [],
});

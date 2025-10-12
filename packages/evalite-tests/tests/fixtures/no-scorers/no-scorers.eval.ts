import { evalite } from "evalite";

evalite("No Scorers", {
  data: () => {
    return [
      {
        input: "test input 1",
        expected: "test output 1",
      },
      {
        input: "test input 2",
        expected: "test output 2",
      },
    ];
  },
  task: async (input) => {
    return input.replace("input", "output");
  },
  // No scorers defined
});

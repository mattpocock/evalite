import { evalite } from "evalite";

evalite("No Scorers Example", {
  data: () => {
    return [
      {
        input: "Hello",
        expected: "Hello, World!",
      },
      {
        input: "Goodbye",
        expected: "Goodbye, World!",
      },
    ];
  },
  task: async (input) => {
    return `${input}, World!`;
  },
  // No scorers field - just collecting outputs for manual review
});

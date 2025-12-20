import { evaluhealth } from "evaluhealth";

evaluhealth("No Scorers Example", {
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

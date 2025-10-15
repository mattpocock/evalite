import { evalite, createScorer } from "evalite";

// Simulates using a Zod schema or other validator with functions
const mockValidator = {
  validate: (value: string) => value.length > 0,
  parse: (value: string) => value.trim(),
};

evalite("Non-serializable data", {
  data: () => {
    return [
      {
        input: "hello",
        expected: mockValidator, // Non-serializable object with functions
      },
    ];
  },
  task: async (input: string) => {
    return input.trim();
  },
  scorers: [
    createScorer({
      name: "Validator check",
      scorer: ({ output, expected }) => {
        const validator = expected as typeof mockValidator;
        return validator.validate(output) ? 1 : 0;
      },
    }),
  ],
});

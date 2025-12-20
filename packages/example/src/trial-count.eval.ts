import { evaluhealth } from "evaluhealth";

// Non-deterministic task that returns random responses
const getRandomGreeting = (name: string): string => {
  const greetings = [
    `Hello, ${name}!`,
    `Hi there, ${name}!`,
    `Hey ${name}!`,
    `Greetings, ${name}!`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)]!;
};

evaluhealth("Random Greeting Test", {
  data: () => [
    {
      input: "Alice",
      expected: "Alice",
    },
    {
      input: "Bob",
      expected: "Bob",
    },
  ],
  task: async (input) => {
    return getRandomGreeting(input);
  },
  scorers: [
    {
      name: "Contains Name",
      scorer: ({ input, output }) => {
        const containsName =
          typeof output === "string" && output.includes(input);
        return containsName ? 1 : 0;
      },
    },
  ],
  // Run each test case 3 times to see variance in non-deterministic output
  trialCount: 3,
});

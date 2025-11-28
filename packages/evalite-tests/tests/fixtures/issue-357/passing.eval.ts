import { evalite } from "evalite";

evalite("Passing Test 1", {
  data: () => [{ input: "a", expected: "a" }],
  task: async (input) => input,
  scorers: [{ name: "Pass", scorer: () => ({ score: 1 }) }],
});

evalite("Passing Test 2", {
  data: () => [{ input: "b", expected: "b" }],
  task: async (input) => input,
  scorers: [{ name: "Pass", scorer: () => ({ score: 1 }) }],
});

evalite("Passing Test 3", {
  data: () => [{ input: "c", expected: "c" }],
  task: async (input) => input,
  scorers: [{ name: "Pass", scorer: () => ({ score: 1 }) }],
});

evalite("Passing Test 4", {
  data: () => [{ input: "d", expected: "d" }],
  task: async (input) => input,
  scorers: [{ name: "Pass", scorer: () => ({ score: 1 }) }],
});

evalite("Passing Test 5", {
  data: () => [{ input: "e", expected: "e" }],
  task: async (input) => input,
  scorers: [{ name: "Pass", scorer: () => ({ score: 1 }) }],
});

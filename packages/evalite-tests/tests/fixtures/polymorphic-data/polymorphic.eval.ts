import { evalite } from "evalite";

// Test with direct array data (new polymorphic feature)
evalite("Direct Array Data", {
  data: [
    {
      input: "test",
      expected: "testdata",
    },
  ],
  task: async (input) => {
    return input + "data";
  },
  scorers: [
    {
      name: "Pass",
      scorer: () => ({ score: 1 }),
    },
  ],
});

// Test with function data (existing feature)
evalite("Function Data", {
  data: () => {
    return [
      {
        input: "foo",
        expected: "foobar",
      },
    ];
  },
  task: async (input) => {
    return input + "bar";
  },
  scorers: [
    {
      name: "Pass",
      scorer: () => ({ score: 1 }),
    },
  ],
});

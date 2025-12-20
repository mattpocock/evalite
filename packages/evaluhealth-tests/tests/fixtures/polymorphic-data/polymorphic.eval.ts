import { evaluhealth } from "evaluhealth";
import { Levenshtein } from "autoevals";

// Test with direct array data (new polymorphic feature)
evaluhealth("Direct Array Data", {
  data: [
    {
      input: "test",
      expected: "testdata",
    },
  ],
  task: async (input) => {
    return input + "data";
  },
  scorers: [Levenshtein],
});

// Test with function data (existing feature)
evaluhealth("Function Data", {
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
  scorers: [Levenshtein],
});

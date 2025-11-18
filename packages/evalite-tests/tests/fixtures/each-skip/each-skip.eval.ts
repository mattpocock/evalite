import { evalite } from "evalite";

evalite.each([
  { name: "Variant A", input: { suffix: "a" } },
  { name: "Variant B", input: { suffix: "b" } },
])("Regular Each Test", {
  data: () => {
    console.log("opts.data() called in Regular Each Test");
    return [{ input: "regular", expected: "output" }];
  },
  task: async (input, variant) => {
    return `output-${variant.suffix}`;
  },
  scorers: [],
});

evalite
  .each([
    { name: "Variant X", input: { suffix: "x" } },
    { name: "Variant Y", input: { suffix: "y" } },
  ])
  .skip("Skipped Each Test", {
    data: () => {
      console.log("opts.data() called in Skipped Each Test");
      return [{ input: "skipped", expected: "output" }];
    },
    task: async (input, variant) => {
      return `output-${variant.suffix}`;
    },
    scorers: [],
  });

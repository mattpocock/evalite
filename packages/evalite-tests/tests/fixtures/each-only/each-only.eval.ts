import { evalite } from "evalite";

evalite.each([{ name: "variant-1", input: "v1" }]).only("Only Each Test", {
  data: () => {
    return [{ input: "only-each", expected: "only-each" }];
  },
  task: function getTask(input: string) {
    console.log("task() called in Only Each Test");
    return input;
  },
  scorers: [],
});

evalite.each([{ name: "variant-1", input: "v1" }])("Regular Each Test", {
  data: () => {
    return [{ input: "regular-each", expected: "regular-each" }];
  },
  task: function getTask(input: string) {
    // This should not be called because another test has .only()
    console.log("task() called in Regular Each Test");
    return input;
  },
  scorers: [],
});

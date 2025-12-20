import { evaluhealth } from "evaluhealth";

evaluhealth("Regular Test", {
  data: () => {
    console.log("opts.data() called in Regular Test");
    return [{ input: "regular", expected: "regular" }];
  },
  task: function getTask(input: string) {
    return input;
  },
  scorers: [],
});

evaluhealth.skip("Skipped Test", {
  data: () => {
    // This function should not be called because the test is skipped.
    console.log("opts.data() called in Skipped Test");
    return [{ input: "skipped", expected: "skipped" }];
  },
  task: function getTask(input: string) {
    return input;
  },
  scorers: [],
});

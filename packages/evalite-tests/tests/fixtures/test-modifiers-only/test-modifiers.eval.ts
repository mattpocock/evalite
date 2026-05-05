import { evalite } from "evalite";

evalite.only("Only Test", {
  data: () => {
    return [{ input: "only", expected: "only" }];
  },
  task: function getTask(input: string) {
    console.log("task() called in Only Test");
    return input;
  },
  scorers: [],
});

evalite("Regular Test", {
  data: () => {
    return [{ input: "regular", expected: "regular" }];
  },
  task: function getTask(input: string) {
    // This should not be called because another test has .only()
    console.log("task() called in Regular Test");
    return input;
  },
  scorers: [],
});

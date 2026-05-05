import { evalite } from "evalite";

evalite.only("Only Test 1", {
  data: () => {
    return [{ input: "only1", expected: "only1" }];
  },
  task: function getTask(input: string) {
    console.log("task() called in Only Test 1");
    return input;
  },
  scorers: [],
});

evalite.only("Only Test 2", {
  data: () => {
    return [{ input: "only2", expected: "only2" }];
  },
  task: function getTask(input: string) {
    console.log("task() called in Only Test 2");
    return input;
  },
  scorers: [],
});

evalite("Regular Test", {
  data: () => {
    return [{ input: "regular", expected: "regular" }];
  },
  task: function getTask(input: string) {
    // This should not be called because other tests have .only()
    console.log("task() called in Regular Test");
    return input;
  },
  scorers: [],
});

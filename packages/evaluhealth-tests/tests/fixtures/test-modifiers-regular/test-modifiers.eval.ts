import { evaluhealth } from "evaluhealth";

evaluhealth("Regular Test 1", {
  data: () => {
    console.log("opts.data() called in Regular Test 1");
    return [{ input: "1", expected: "1" }];
  },
  task: function getTask(input: string) {
    return input;
  },
  scorers: [],
});

evaluhealth("Regular Test 2", {
  data: () => {
    console.log("opts.data() called in Regular Test 2");
    return [{ input: "2", expected: "2" }];
  },
  task: function getTask(input: string) {
    return input;
  },
  scorers: [],
});

evaluhealth("Regular Test 3", {
  data: () => {
    console.log("opts.data() called in Regular Test 3");
    return [{ input: "3", expected: "3" }];
  },
  task: function getTask(input: string) {
    return input;
  },
  scorers: [],
});

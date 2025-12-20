import { evaluhealth } from "evaluhealth";

evaluhealth("Failing", {
  data: () => {
    return [
      {
        input: "abc",
      },
    ];
  },
  task: async () => {
    return "output";
  },
  scorers: [],
});

throw new Error("Module level error");

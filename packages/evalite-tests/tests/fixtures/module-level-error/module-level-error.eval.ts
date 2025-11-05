import { evalite } from "evalite";

evalite("Failing", {
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

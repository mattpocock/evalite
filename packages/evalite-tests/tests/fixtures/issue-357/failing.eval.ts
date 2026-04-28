import { evalite } from "evalite";

evalite("Should Not Run", {
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

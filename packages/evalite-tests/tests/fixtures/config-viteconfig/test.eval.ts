import { evalite } from "evalite";

evalite("ViteConfig Test", {
  data: () => [{ input: "a", expected: "a" }],
  task: async (input) => {
    return input;
  },
  scorers: [],
});

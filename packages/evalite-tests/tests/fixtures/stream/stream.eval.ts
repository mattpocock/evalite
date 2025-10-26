import { evalite } from "evalite";
import { Levenshtein } from "autoevals";

evalite("Stream", {
  data: () => {
    return [
      {
        input: "abc",
        expected: "abcdef",
      },
    ];
  },
  task: async (_input) => {
    const arr = ["a", "b", "c", "d", "e", "f"];

    const stream = ReadableStream.from(arr);

    return stream;
  },
  scorers: [Levenshtein],
});

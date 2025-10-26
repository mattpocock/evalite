import { createSimpleScorer } from "./base.js";
import type { Evalite } from "../types.js";

export const exactMatch =
  createSimpleScorer<Evalite.Scorers.ExactMatchExpected>({
    name: "Exact Match",
    description: "Checks if the output is the same as the expected value.",
    scorer: ({ output, expected }) => {
      if (
        typeof output !== "string" ||
        typeof expected?.expected !== "string"
      ) {
        throw new Error("Output and expected must be strings");
      }

      return {
        score: output === expected.expected ? 1 : 0,
        metadata: {
          expected: expected.expected,
          output,
        },
      };
    },
  });

export const contains = createSimpleScorer<Evalite.Scorers.ContainsExpected>({
  name: "Contains",
  description: "Checks if the output contains the expected value.",
  scorer: ({ output, expected }) => {
    if (typeof output !== "string" || typeof expected?.expected !== "string") {
      throw new Error(
        "Output and expected must be strings or an array of strings"
      );
    }

    return {
      score: output.includes(expected.expected) ? 1 : 0,
      metadata: {
        expected: expected.expected,
        output,
      },
    };
  },
});

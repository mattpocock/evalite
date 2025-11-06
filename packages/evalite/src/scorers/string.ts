import { createSimpleScorer } from "./base.js";
import type { Evalite } from "../types.js";

/**
 * Checks if your AI's output exactly matches the
 * expected text character-for-character.
 *
 * Returns 1 if they match, 0 otherwise.
 *
 * When to use: For testing structured outputs
 * like JSON, code, or specific phrases that must
 * be exact.
 *
 * When NOT to use: When slight variations in
 * wording are acceptable (use answerSimilarity
 * instead).
 */
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

/**
 * Checks if your AI's output contains the
 * expected substring anywhere in the text.
 *
 * Returns 1 if found, 0 otherwise.
 *
 * When to use: To verify specific keywords or
 * phrases appear in the response, regardless of
 * surrounding text.
 *
 * When NOT to use: When you need exact matches
 * (use exactMatch) or semantic similarity (use
 * answerSimilarity).
 */
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

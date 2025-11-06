import { createSimpleScorer } from "./base.js";
import type { Evalite } from "../types.js";

/**
 * Checks if your AI's output exactly matches the
 * expected text character-for-character.
 *
 * Returns 1 if they match, 0 otherwise.
 *
 * **When to use**: For testing structured outputs
 * like JSON, code, or specific phrases that must
 * be exact.
 *
 * **When NOT to use**: When slight variations in
 * wording are acceptable (use answerSimilarity
 * instead).
 *
 * - `expected.reference` (required): Exact string
 * that output should match character-for-character.
 */
export const exactMatch = createSimpleScorer<
  string,
  Evalite.Scorers.ExactMatchExpected
>({
  name: "Exact Match",
  description: "Checks if the output is the same as the expected value.",
  scorer: ({ output, expected }) => {
    if (typeof output !== "string" || typeof expected?.reference !== "string") {
      throw new Error("Output and expected must be strings");
    }

    return {
      score: output === expected.reference ? 1 : 0,
      metadata: {
        expected: expected.reference,
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
 * **When to use**: To verify specific keywords or
 * phrases appear in the response, regardless of
 * surrounding text.
 *
 * **When NOT to use**: When you need exact matches
 * (use exactMatch) or semantic similarity (use
 * answerSimilarity).
 *
 * - `expected.reference` (required): Substring
 * that should appear anywhere in output.
 */
export const contains = createSimpleScorer<
  string,
  Evalite.Scorers.ContainsExpected
>({
  name: "Contains",
  description: "Checks if the output contains the expected value.",
  scorer: ({ output, expected }) => {
    if (typeof output !== "string" || typeof expected?.reference !== "string") {
      throw new Error("Output and expected must be strings");
    }

    return {
      score: output.includes(expected.reference) ? 1 : 0,
      metadata: {
        expected: expected.reference,
        output,
      },
    };
  },
});

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
 * @param opts.actual - The actual output to check
 * @param opts.expected - The exact string that output should match
 */
export async function exactMatch(opts: Evalite.Scorers.ExactMatchOpts) {
  if (typeof opts.actual !== "string" || typeof opts.expected !== "string") {
    throw new Error("Both actual and expected must be strings");
  }

  return {
    name: "Exact Match",
    description: "Checks if the output is the same as the expected value.",
    score: opts.actual === opts.expected ? 1 : 0,
    metadata: {
      expected: opts.expected,
      output: opts.actual,
    },
  };
}

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
 * @param opts.actual - The actual output to check
 * @param opts.expected - Substring that should appear anywhere in output
 */
export async function contains(opts: Evalite.Scorers.ContainsOpts) {
  if (typeof opts.actual !== "string" || typeof opts.expected !== "string") {
    throw new Error("Both actual and expected must be strings");
  }

  return {
    name: "Contains",
    description: "Checks if the output contains the expected value.",
    score: opts.actual.includes(opts.expected) ? 1 : 0,
    metadata: {
      expected: opts.expected,
      output: opts.actual,
    },
  };
}

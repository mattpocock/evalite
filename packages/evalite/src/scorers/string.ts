import type { Evalite } from "../types.js";
import levenshteinDistance from "js-levenshtein";

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
  };
}

/**
 * Measures string similarity using Levenshtein distance
 * (edit distance), normalized to a 0-1 score.
 *
 * Returns a score from 0 to 1, where 1 means identical
 * strings and 0 means completely different.
 *
 * **When to use**: For fuzzy string matching when you
 * want to tolerate small typos, spelling variations,
 * or minor differences. Useful for testing outputs
 * that should be close but not necessarily exact.
 *
 * **When NOT to use**: When exact matches are required
 * (use exactMatch) or when you need semantic similarity
 * that understands meaning (use answerSimilarity).
 *
 * @param opts.actual - The actual output to check
 * @param opts.expected - The expected string to compare against
 */
export async function levenshtein(opts: Evalite.Scorers.LevenshteinOpts) {
  if (typeof opts.actual !== "string" || typeof opts.expected !== "string") {
    throw new Error("Both actual and expected must be strings");
  }

  const maxLen = Math.max(opts.actual.length, opts.expected.length);

  let score = 1;
  if (maxLen > 0) {
    const distance = levenshteinDistance(opts.actual, opts.expected);
    score = 1 - distance / maxLen;
  }

  return {
    name: "Levenshtein",
    description:
      "Measures string similarity using edit distance (0 = different, 1 = identical).",
    score,
  };
}

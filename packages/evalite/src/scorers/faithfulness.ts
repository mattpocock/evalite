import type { Evalite } from "../types.js";
import type { LanguageModel } from "ai";
import {
  decomposeIntoStatements,
  evaluateStatementFaithfulness,
} from "./utils/statement-evaluation.js";
import { wrapAISDKModel } from "../ai-sdk.js";

/**
 * Checks if your AI is making things up or
 * sticking to the provided information.
 *
 * This scorer detects hallucinations by:
 * 1. Breaking your AI's answer into individual
 *    claims
 * 2. Checking if each claim is supported by the
 *    context you provided
 * 3. Scoring based on percentage of supported
 *    claims
 *
 * **When to use**: Essential for RAG systems where
 * accuracy matters (medical, legal, financial).
 * Catches when your AI invents facts not in
 * your documents.
 *
 * **When NOT to use**: If your AI should add
 * knowledge beyond the context, or for creative
 * tasks where invention is desired.
 *
 * @param opts.question - The question being asked
 * @param opts.answer - The AI's answer to evaluate (string only, not multi-turn)
 * @param opts.groundTruth - Array of source documents/passages that should support all claims
 * @param opts.model - Language model to use for evaluation
 */
export async function faithfulness(opts: Evalite.Scorers.FaithfulnessOpts) {
  if (!opts.groundTruth || opts.groundTruth.length === 0) {
    throw new Error("No ground truth provided or the ground truth is empty");
  }

  if (typeof opts.answer !== "string") {
    throw new Error("Faithfulness scorer does not support multi-turn output");
  }

  const cachedModel = wrapAISDKModel(opts.model);

  const statements = await decomposeIntoStatements(
    opts.question,
    opts.answer,
    cachedModel
  );
  if (statements.length === 0) {
    throw new Error("No statements were generated from the answer");
  }

  const context = opts.groundTruth.join("\n");
  const verdicts = await evaluateStatementFaithfulness(
    context,
    statements,
    cachedModel
  );

  const score = computeScore(verdicts);

  return {
    name: "Faithfulness",
    description:
      "Evaluates the faithfulness of the model's response to the retrieved contexts",
    score,
    metadata: verdicts.map((s) => ({
      statement: s.statement,
      reason: s.reason,
      verdict: s.verdict,
    })),
  };
}

function computeScore(statements: Evalite.Scorers.FaithfulnessStatements) {
  if (statements.length === 0) {
    return 0;
  }

  const faithfulStatements = statements.filter((s) => s.verdict === 1).length;
  return faithfulStatements / statements.length;
}

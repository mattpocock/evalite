import { createLLMScorer } from "./base.js";
import type { Evalite } from "../types.js";
import { isMultiTurnOutput } from "./utils.js";
import {
  decomposeIntoStatements,
  evaluateStatementFaithfulness,
} from "./utils/statement-evaluation.js";

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
 * When to use: Essential for RAG systems where
 * accuracy matters (medical, legal, financial).
 * Catches when your AI invents facts not in
 * your documents.
 *
 * When NOT to use: If your AI should add
 * knowledge beyond the context, or for creative
 * tasks where invention is desired.
 */
export const faithfulness =
  createLLMScorer<Evalite.Scorers.FaithfulnessExpected>({
    name: "Faithfulness",
    description:
      "Evaluates the faithfulness of the model's response to the retrieved contexts",

    scorer: async ({ input, output, expected, model }) => {
      if (!expected?.groundTruth || expected.groundTruth.length === 0)
        throw new Error(
          "No ground truth provided or the ground truth is empty"
        );

      if (isMultiTurnOutput(output)) {
        throw new Error(
          "Faithfulness scorer does not support multi-turn output"
        );
      }

      const statements = await decomposeIntoStatements(input, output, model);
      if (statements.length === 0)
        throw new Error("No statements were generated from the answer");

      const context = expected.groundTruth.join("\n");
      const verdicts = await evaluateStatementFaithfulness(
        context,
        statements,
        model
      );

      const score = computeScore(verdicts);

      return {
        score,
        metadata: verdicts.map((s) => ({
          statement: s.statement,
          reason: s.reason,
          verdict: s.verdict,
        })),
      };

      function computeScore(
        statements: Evalite.Scorers.FaithfulnessStatements
      ) {
        if (statements.length === 0) {
          return 0;
        }

        const faithfulStatements = statements.filter(
          (s) => s.verdict === 1
        ).length;
        return faithfulStatements / statements.length;
      }
    },
  });

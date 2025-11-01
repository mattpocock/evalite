import { createLLMScorer } from "./base.js";
import type { Evalite } from "../types.js";
import { isMultiTurnOutput } from "./utils.js";
import {
  decomposeIntoStatements,
  evaluateStatementFaithfulness,
} from "./utils/statement-evaluation.js";

/**
 * Faithfulness metric evaluates how grounded the model's response is in the provided context.
 *
 * The metric works by:
 * 1. Breaking down the response into atomic statements
 * 2. Checking each statement against the retrieved contexts
 * 3. Computing a score based on the ratio of faithful statements
 *
 * @param model - The model to use for the evaluation
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

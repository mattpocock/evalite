import {
  cosineSimilarity,
  embedMany,
  generateObject,
  jsonSchema,
  type EmbeddingModel,
  type LanguageModel,
} from "ai";
import type { Evalite } from "../types.js";
import { promptBuilder } from "./prompt-builder.js";
import { decomposeIntoStatements } from "./utils/statement-evaluation.js";
import { computeFBetaScore } from "./utils/scoring.js";
import { wrapAISDKModel } from "../ai-sdk.js";

/**
 * JSON schema for TP/FP/FN classification
 */
const AnswerCorrectnessClassificationSchema = jsonSchema<{
  classification: Evalite.Scorers.AnswerCorrectnessClassification;
}>({
  type: "object",
  properties: {
    classification: {
      type: "object",
      properties: {
        TP: {
          type: "array",
          items: {
            type: "object",
            properties: {
              statement: { type: "string" },
              reason: { type: "string" },
            },
            required: ["statement", "reason"],
          },
          description:
            "True Positives: Statements in the answer that are supported by the reference",
        },
        FP: {
          type: "array",
          items: {
            type: "object",
            properties: {
              statement: { type: "string" },
              reason: { type: "string" },
            },
            required: ["statement", "reason"],
          },
          description:
            "False Positives: Statements in the answer that are not supported by the reference (hallucinations)",
        },
        FN: {
          type: "array",
          items: {
            type: "object",
            properties: {
              statement: { type: "string" },
              reason: { type: "string" },
            },
            required: ["statement", "reason"],
          },
          description:
            "False Negatives: Statements in the reference that are missing from the answer",
        },
      },
      required: ["TP", "FP", "FN"],
    },
  },
  required: ["classification"],
});

/**
 * Prompt for classifying statements as TP/FP/FN for answer correctness evaluation
 */
const correctnessClassifierPrompt = promptBuilder({
  prompt: `Given a question, a set of statements from an answer, and a set of statements from the reference answer, classify each statement:

- **TP (True Positive)**: Statements in the answer that are supported by or match the reference statements
- **FP (False Positive)**: Statements in the answer that are NOT supported by the reference (hallucinations or incorrect information)
- **FN (False Negative)**: Statements in the reference that are missing from the answer

For each statement, provide the statement itself and a reason for the classification.`,
  examples: [
    {
      input: {
        question: "What is the capital of France?",
        answerStatements: [
          "Paris is the capital of France.",
          "Paris has many museums.",
          "The Eiffel Tower is in London.",
        ],
        referenceStatements: [
          "Paris is the capital of France.",
          "Paris is located in the north of France.",
        ],
      },
      output: {
        classification: {
          TP: [
            {
              statement: "Paris is the capital of France.",
              reason:
                "This statement exactly matches a reference statement and is factually correct.",
            },
          ],
          FP: [
            {
              statement: "Paris has many museums.",
              reason:
                "While potentially true, this statement is not mentioned in the reference answer.",
            },
            {
              statement: "The Eiffel Tower is in London.",
              reason:
                "This statement is factually incorrect and contradicts common knowledge. The Eiffel Tower is in Paris, not London.",
            },
          ],
          FN: [
            {
              statement: "Paris is located in the north of France.",
              reason:
                "This statement is in the reference but missing from the answer.",
            },
          ],
        },
      },
    },
    {
      input: {
        question: "Who invented the telephone?",
        answerStatements: [
          "Alexander Graham Bell invented the telephone.",
          "Alexander Graham Bell was a Scottish-born inventor.",
        ],
        referenceStatements: [
          "Alexander Graham Bell invented the telephone.",
          "The telephone was patented in 1876.",
        ],
      },
      output: {
        classification: {
          TP: [
            {
              statement: "Alexander Graham Bell invented the telephone.",
              reason: "This statement matches the reference statement exactly.",
            },
          ],
          FP: [
            {
              statement: "Alexander Graham Bell was a Scottish-born inventor.",
              reason:
                "While factually correct, this information is not present in the reference answer.",
            },
          ],
          FN: [
            {
              statement: "The telephone was patented in 1876.",
              reason:
                "This statement is in the reference but not mentioned in the answer.",
            },
          ],
        },
      },
    },
  ],
  task: ["question", "answerStatements", "referenceStatements"],
});

const ANSWER_CORRECTNESS_DEFAULT_WEIGHTS: [number, number] = [0.75, 0.25];
const ANSWER_CORRECTNESS_DEFAULT_BETA = 1.0;

/**
 * Checks if your AI's answer is correct by comparing
 * it to a reference answer.
 *
 * This scorer does two things:
 * 1. Checks factual accuracy - breaks both answers
 *    into claims and verifies your AI's claims match
 *    the reference (catches hallucinations)
 * 2. Checks semantic similarity - measures how
 *    similar the overall meaning is
 *
 * The final score combines both. By default,
 * factual accuracy is 75% and similarity is 25%.
 *
 * **When to use**: When you need comprehensive answer
 * evaluation that balances exact correctness with
 * semantic equivalence.
 *
 * **When NOT to use**: If you only care about exact
 * facts (use faithfulness), or only semantic
 * similarity (use answerSimilarity).
 *
 * @param opts.question - The question being asked
 * @param opts.answer - The AI's answer to evaluate
 * @param opts.reference - Reference answer for comparison (complete, accurate answer)
 * @param opts.model - Language model to use for evaluation
 * @param opts.embeddingModel - Embedding model to use for semantic similarity
 * @param opts.weights - Weights for combining factuality and similarity scores (default: [0.75, 0.25])
 * @param opts.beta - Beta parameter for F-beta score calculation (default: 1.0). Beta > 1 favors recall, beta < 1 favors precision
 */
export async function answerCorrectness(
  opts: Evalite.Scorers.AnswerCorrectnessOpts
) {
  const weights = opts.weights ?? ANSWER_CORRECTNESS_DEFAULT_WEIGHTS;
  const beta = opts.beta ?? ANSWER_CORRECTNESS_DEFAULT_BETA;

  if (weights.length !== 2) {
    throw new Error(
      "Weights must be an array of two numbers: [factualityWeight, similarityWeight]"
    );
  }
  if (weights.every((w) => w === 0)) {
    throw new Error("At least one weight must be non-zero");
  }
  if (!weights.every((w) => w >= 0)) {
    throw new Error("Weights must be non-negative");
  }

  if (typeof beta !== "number" || beta <= 0) {
    throw new Error(
      "Beta must be a positive number. Beta > 1 favors recall, beta < 1 favors precision"
    );
  }

  const cachedModel = wrapAISDKModel(opts.model);

  const [responseStatements, referenceStatements] = await Promise.all([
    decomposeIntoStatements(opts.question, opts.answer, cachedModel),
    decomposeIntoStatements(opts.question, opts.reference, cachedModel),
  ]);

  let factualityScore = 1.0;
  let classification: Evalite.Scorers.AnswerCorrectnessClassification = {
    TP: [],
    FP: [],
    FN: [],
  };

  if (responseStatements.length > 0 && referenceStatements.length > 0) {
    const result = await generateObject({
      model: cachedModel,
      schema: AnswerCorrectnessClassificationSchema,
      prompt: correctnessClassifierPrompt({
        question: opts.question,
        answerStatements: responseStatements,
        referenceStatements: referenceStatements,
      }),
    });

    classification = result.object.classification;
    factualityScore = computeFBetaScore(classification, beta);
  } else if (
    responseStatements.length === 0 &&
    referenceStatements.length === 0
  ) {
    factualityScore = 1.0;
  } else {
    factualityScore = 0.0;
  }

  let similarityScore = 0.0;
  if (weights[1] > 0) {
    const { embeddings } = await embedMany({
      model: opts.embeddingModel,
      values: [opts.reference, opts.answer],
    });

    const [referenceEmbedding, responseEmbedding] = embeddings;

    if (!referenceEmbedding || !responseEmbedding) {
      similarityScore = 0.0;
    } else {
      similarityScore = cosineSimilarity(referenceEmbedding, responseEmbedding);
    }
  }

  const totalWeight = weights[0] + weights[1];
  const finalScore =
    (factualityScore * weights[0] + similarityScore * weights[1]) / totalWeight;

  const metadata: Evalite.Scorers.AnswerCorrectnessMetadata = {
    classification,
    factualityScore,
    similarityScore,
    responseStatements,
    referenceStatements,
  };

  return {
    name: "Answer Correctness",
    description:
      "Evaluates answer correctness using statement-level classification (TP/FP/FN) and semantic similarity",
    score: finalScore,
    metadata,
  };
}

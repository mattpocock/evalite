import { generateObject, jsonSchema } from "ai";
import type { Evalite } from "../types.js";
import { createLLMScorer } from "./base.js";
import { isMultiTurnOutput } from "./utils.js";
import { promptBuilder } from "./prompt-builder.js";

const ContextRecallClassificationsSchema = jsonSchema<{
  classifications: Evalite.Scorers.ContextRecallClassifications;
}>({
  type: "object",
  properties: {
    classifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          statement: {
            type: "string",
            description: "The statement from the answer",
          },
          reason: {
            type: "string",
            description: "The reason for the attribution decision",
          },
          attributed: {
            type: "integer",
            minimum: 0,
            maximum: 1,
            description:
              "Whether the statement can be attributed to the context (0 or 1)",
          },
        },
        required: ["statement", "reason", "attributed"],
      },
    },
  },
  required: ["classifications"],
});

const classifyStatementsPrompt = promptBuilder({
  prompt:
    "Given a context and an answer, analyze each sentence in the answer and classify if the sentence can be attributed to the given context or not. Use only 'Yes' (1) or 'No' (0) as a binary classification. Provide a reason for each classification. Output JSON following the required schema.",
  examples: [
    {
      input: {
        question: "What can you tell me about albert Albert Einstein?",
        context:
          "Albert Einstein (14 March 1879 - 18 April 1955) was a German-born theoretical physicist, widely held to be one of the greatest and most influential scientists of all time. Best known for developing the theory of relativity, he also made important contributions to quantum mechanics, and was thus a central figure in the revolutionary reshaping of the scientific understanding of nature that modern physics accomplished in the first decades of the twentieth century. His mass-energy equivalence formula E = mc2, which arises from relativity theory, has been called 'the world's most famous equation'. He received the 1921 Nobel Prize in Physics 'for his services to theoretical physics, and especially for his discovery of the law of the photoelectric effect', a pivotal step in the development of quantum theory. His work is also known for its influence on the philosophy of science. In a 1999 poll of 130 leading physicists worldwide by the British journal Physics World, Einstein was ranked the greatest physicist of all time. His intellectual achievements and originality have made Einstein synonymous with genius.",
        answer:
          "Albert Einstein, born on 14 March 1879, was a German-born theoretical physicist, widely held to be one of the greatest and most influential scientists of all time. He received the 1921 Nobel Prize in Physics for his services to theoretical physics. He published 4 papers in 1905. Einstein moved to Switzerland in 1895.",
      },
      output: {
        classifications: [
          {
            statement:
              "Albert Einstein, born on 14 March 1879, was a German-born theoretical physicist, widely held to be one of the greatest and most influential scientists of all time.",
            reason:
              "The date of birth of Einstein is mentioned clearly in the context.",
            attributed: 1,
          },
          {
            statement:
              "He received the 1921 Nobel Prize in Physics for his services to theoretical physics.",
            reason: "The exact sentence is present in the given context.",
            attributed: 1,
          },
          {
            statement: "He published 4 papers in 1905.",
            reason:
              "There is no mention about papers he wrote in the given context.",
            attributed: 0,
          },
          {
            statement: "Einstein moved to Switzerland in 1895.",
            reason:
              "There is no supporting evidence for this in the given context.",
            attributed: 0,
          },
        ],
      },
    },
  ],
  task: ["question", "context", "answer"],
});

export const contextRecall =
  createLLMScorer<Evalite.Scorers.ContextRecallExpected>({
    name: "Context Recall",
    description:
      "Estimates context recall by analyzing how much of the reference answer can be attributed to retrieved contexts",
    scorer: async ({ input, output, expected, model }) => {
      if (!expected?.groundTruth || expected?.groundTruth.length === 0)
        throw new Error(
          "No ground truth provided or the ground truth is empty"
        );

      if (isMultiTurnOutput(output)) {
        throw new Error(
          "Context Recall scorer does not support multi-turn input"
        );
      }

      const classifications = await classifyStatements(
        input,
        output,
        expected.groundTruth
      );

      if (classifications.length === 0)
        throw new Error("No classifications were found from the answer");

      const score = calculateScore(classifications);

      return {
        score,
        metadata: {
          classifications,
          reason: `${
            classifications.filter((c) => c.attributed === 1).length
          } out of ${
            classifications.length
          } statements from the response were attributed to the retrieved contexts`,
        },
      };

      function calculateScore(
        classifications: Evalite.Scorers.ContextRecallClassifications
      ) {
        if (classifications.length === 0) return 0;

        const attributedClassifications = classifications.filter(
          (c) => c.attributed === 1
        ).length;
        return attributedClassifications / classifications.length;
      }

      async function classifyStatements(
        question: string,
        answer: string,
        groundTruth: string[]
      ) {
        const context = groundTruth.join("\n");

        const result = await generateObject({
          model: model,
          schema: ContextRecallClassificationsSchema,
          prompt: classifyStatementsPrompt({ question, context, answer }),
        });

        return result.object.classifications;
      }
    },
  });

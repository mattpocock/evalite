import { cosineSimilarity, embedMany, generateObject, jsonSchema } from "ai";
import type { Evalite } from "../types.js";
import { createLLMAndEmbeddingScorer } from "./base.js";
import { promptBuilder } from "./prompt-builder.js";
import { isMultiTurnOutput } from "./utils.js";

const AnswerRelevancyOutputSchema = jsonSchema<{
  question: string;
  noncommittal: number;
}>({
  type: "object",
  properties: {
    question: {
      type: "string",
      description: "A question that the given answer could be responding to",
    },
    noncommittal: {
      type: "number",
      description:
        "1 if the answer is noncommittal (evasive, vague, ambiguous), 0 if committal",
      enum: [0, 1],
    },
  },
  required: ["question", "noncommittal"],
  additionalProperties: false,
});

const answerRelevancyPrompt = promptBuilder({
  prompt: `Generate a question for the given answer and identify if the answer is noncommittal. Give noncommittal as 1 if the answer is noncommittal and 0 if the answer is committal. A noncommittal answer is one that is evasive, vague, or ambiguous. For example, "I don't know" or "I'm not sure" are noncommittal answers.`,
  examples: [
    {
      input: {
        response: "Albert Einstein was born in Germany.",
      },
      output: {
        question: "Where was Albert Einstein born?",
        noncommittal: 0,
      },
    },
    {
      input: {
        response:
          "I don't know about the groundbreaking feature of the smartphone invented in 2023 as am unaware of information beyond 2022.",
      },
      output: {
        question:
          "What was the groundbreaking feature of the smartphone invented in 2023?",
        noncommittal: 1,
      },
    },
  ],
  task: ["response"],
});

/**
 * Checks if your AI actually answered the question
 * asked (vs going off-topic or being evasive).
 *
 * How it works: Looks at your AI's answer and asks
 * "What question would this answer?" Then compares
 * those generated questions to your original
 * question. If similar, your AI stayed on topic.
 *
 * Also detects evasive answers like "I don't know"
 * and scores them as 0.
 *
 * **When to use**: When you want to catch answers that
 * are technically correct but don't address what
 * was asked.
 *
 * **When NOT to use**: If your use case allows
 * tangential or exploratory responses.
 */
export const answerRelevancy = createLLMAndEmbeddingScorer({
  name: "Answer Relevancy",
  description:
    "Evaluates how relevant the response is to the original question by generating hypothetical questions and computing semantic similarity",

  scorer: async ({ input, output, model, embeddingModel }) => {
    if (typeof input !== "string" || !input.trim()) {
      throw new Error(
        "Answer Relevancy scorer requires a non-empty string input (the original question)"
      );
    }

    if (isMultiTurnOutput(output)) {
      throw new Error(
        "Answer Relevancy scorer does not support multi-turn outputs"
      );
    }

    const outputText = output;

    if (!outputText.trim()) {
      return {
        score: 0,
        metadata: {
          generatedQuestions: [],
          similarities: [],
          allNoncommittal: false,
        } satisfies Evalite.Scorers.AnswerRelevancyMetadata,
      };
    }

    const strictness = 3;
    const generatedQuestions: string[] = [];
    const noncommittalFlags: boolean[] = [];

    for (let i = 0; i < strictness; i++) {
      try {
        const result = await generateObject({
          model,
          schema: AnswerRelevancyOutputSchema,
          prompt: answerRelevancyPrompt({ response: outputText }),
        });

        if (result.object.question && result.object.question.trim()) {
          generatedQuestions.push(result.object.question.trim());
          noncommittalFlags.push(result.object.noncommittal === 1);
        }
      } catch (error) {
        console.warn(
          `Failed to generate question ${i + 1}/${strictness}:`,
          error
        );
      }
    }

    if (generatedQuestions.length === 0) {
      return {
        score: 0,
        metadata: {
          generatedQuestions: [],
          similarities: [],
          allNoncommittal: false,
        } satisfies Evalite.Scorers.AnswerRelevancyMetadata,
      };
    }

    const allNoncommittal = noncommittalFlags.every((flag) => flag);

    const allTexts = [input, ...generatedQuestions];
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: allTexts,
    });

    const originalQuestionEmbedding = embeddings[0];
    const generatedQuestionEmbeddings = embeddings.slice(1);

    if (
      !originalQuestionEmbedding ||
      generatedQuestionEmbeddings.some((emb) => !emb)
    ) {
      return {
        score: 0,
        metadata: {
          generatedQuestions,
          similarities: [],
          allNoncommittal,
        } satisfies Evalite.Scorers.AnswerRelevancyMetadata,
      };
    }

    const similarities = generatedQuestionEmbeddings.map((genEmbed) =>
      cosineSimilarity(originalQuestionEmbedding, genEmbed)
    );

    const meanSimilarity =
      similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;

    const finalScore = allNoncommittal ? 0 : meanSimilarity;

    return {
      score: finalScore,
      metadata: {
        generatedQuestions,
        similarities,
        allNoncommittal,
      } satisfies Evalite.Scorers.AnswerRelevancyMetadata,
    };
  },
});

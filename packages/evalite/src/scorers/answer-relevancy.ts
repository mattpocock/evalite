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
import { wrapAISDKModel } from "../ai-sdk.js";

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
 *
 * @param opts.question - The original question being asked
 * @param opts.answer - The AI's answer to evaluate (string only, not multi-turn)
 * @param opts.model - Language model to use for evaluation
 * @param opts.embeddingModel - Embedding model to use for semantic similarity
 */
export async function answerRelevancy(
  opts: Evalite.Scorers.AnswerRelevancyOpts
) {
  if (!opts.question.trim()) {
    throw new Error("Question must be a non-empty string");
  }

  if (typeof opts.answer !== "string") {
    throw new Error(
      "Answer Relevancy scorer does not support multi-turn outputs"
    );
  }

  if (!opts.answer.trim()) {
    return {
      name: "Answer Relevancy",
      description:
        "Evaluates how relevant the response is to the original question by generating hypothetical questions and computing semantic similarity",
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

  const cachedModel = wrapAISDKModel(opts.model);

  for (let i = 0; i < strictness; i++) {
    try {
      const result = await generateObject({
        model: cachedModel,
        schema: AnswerRelevancyOutputSchema,
        prompt: answerRelevancyPrompt({ response: opts.answer }),
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
      name: "Answer Relevancy",
      description:
        "Evaluates how relevant the response is to the original question by generating hypothetical questions and computing semantic similarity",
      score: 0,
      metadata: {
        generatedQuestions: [],
        similarities: [],
        allNoncommittal: false,
      } satisfies Evalite.Scorers.AnswerRelevancyMetadata,
    };
  }

  const allNoncommittal = noncommittalFlags.every((flag) => flag);

  const allTexts = [opts.question, ...generatedQuestions];
  const { embeddings } = await embedMany({
    model: opts.embeddingModel,
    values: allTexts,
  });

  const originalQuestionEmbedding = embeddings[0];
  const generatedQuestionEmbeddings = embeddings.slice(1);

  if (
    !originalQuestionEmbedding ||
    generatedQuestionEmbeddings.some((emb) => !emb)
  ) {
    return {
      name: "Answer Relevancy",
      description:
        "Evaluates how relevant the response is to the original question by generating hypothetical questions and computing semantic similarity",
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
    name: "Answer Relevancy",
    description:
      "Evaluates how relevant the response is to the original question by generating hypothetical questions and computing semantic similarity",
    score: finalScore,
    metadata: {
      generatedQuestions,
      similarities,
      allNoncommittal,
    } satisfies Evalite.Scorers.AnswerRelevancyMetadata,
  };
}

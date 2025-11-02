import { generateObject, jsonSchema, type LanguageModel } from "ai";
import { promptBuilder } from "../prompt-builder.js";
import type { Evalite } from "../../types.js";

/**
 * JSON schema for generating statements from text
 */
export const StatementGeneratorOutputSchema = jsonSchema<{
  statements: string[];
}>({
  type: "object",
  properties: {
    statements: {
      type: "array",
      items: {
        type: "string",
      },
      description: "The generated statements",
    },
  },
  required: ["statements"],
});

/**
 * JSON schema for statement evaluation with verdicts and reasons
 */
export const FaithfulnessStatementsOutputSchema = jsonSchema<{
  statements: Evalite.Scorers.FaithfulnessStatements;
}>({
  type: "object",
  properties: {
    statements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          statement: {
            type: "string",
            description: "the original statement, word-by-word",
          },
          reason: {
            type: "string",
            description: "the reason of the verdict",
          },
          verdict: {
            type: "integer",
            minimum: 0,
            maximum: 1,
            description: "the verdict (0/1) of the faithfulness",
          },
        },
        required: ["statement", "reason", "verdict"],
      },
    },
  },
  required: ["statements"],
});

/**
 * JSON schema for simple statement evaluation (verdicts only, no reasons)
 */
export const SimpleVerdictOutputSchema = jsonSchema<{
  verdicts: number[];
}>({
  type: "object",
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "integer",
        minimum: 0,
        maximum: 1,
        description: "1 if the statement is supported by context, 0 otherwise",
      },
      description: "Array of verdicts for each statement",
    },
  },
  required: ["verdicts"],
});

/**
 * Prompt for generating statements from a question-answer pair
 */
export const generateStatementsPrompt = promptBuilder({
  prompt:
    "Given a question and an answer, analyze the complexity of each sentence in the answer. Break down each sentence into one or more fully understandable statements. Ensure that no pronouns are used in any statement. Format the outputs in JSON.",
  examples: [
    {
      input: {
        question: "Who was Albert Einstein and what is he best known for?",
        answer:
          "He was a German-born theoretical physicist, widely acknowledged to be one of the greatest and most influential physicists of all time. He was best known for developing the theory of relativity, he also made important contributions to the development of the theory of quantum mechanics.",
      },
      output: {
        statements: [
          {
            statement:
              "Albert Einstein was a German-born theoretical physicist.",
          },
          {
            statement:
              "Albert Einstein is recognized as one of the greatest and most influential physicists of all time.",
          },
          {
            statement:
              "Albert Einstein was best known for developing the theory of relativity.",
          },
          {
            statement:
              "Albert Einstein also made important contributions to the development of the theory of quantum mechanics.",
          },
        ],
      },
    },
  ],
  task: ["question", "answer"],
});

/**
 * Prompt for evaluating statements with detailed verdicts and reasons
 */
export const evaluateStatementsPrompt = promptBuilder({
  prompt:
    "Your task is to judge the faithfulness of a series of statements based on a given context. For each statement you must return verdict as 1 if the statement can be directly inferred based on the context or 0 if the statement can not be directly inferred based on the context.",
  examples: [
    {
      input: {
        context:
          "John is a student at XYZ University. He is pursuing a degree in Computer Science. He is enrolled in several courses this semester, including Data Structures, Algorithms, and Database Management. John is a diligent student and spends a significant amount of time studying and completing assignments. He often stays late in the library to work on his projects.",
        statements: [
          { statement: "John is majoring in Biology." },
          {
            statement: "John is taking a course on Artificial Intelligence.",
          },
          { statement: "John is a dedicated student." },
          { statement: "John has a part-time job." },
        ],
      },
      output: {
        statements: [
          {
            statement: "John is majoring in Biology.",
            reason:
              "John's major is explicitly mentioned as Computer Science. There is no information suggesting he is majoring in Biology.",
            verdict: 0,
          },
          {
            statement: "John is taking a course on Artificial Intelligence.",
            reason:
              "The context mentions the courses John is currently enrolled in, and Artificial Intelligence is not mentioned. Therefore, it cannot be deduced that John is taking a course on AI.",
            verdict: 0,
          },
          {
            statement: "John is a dedicated student.",
            reason:
              "The context states that he spends a significant amount of time studying and completing assignments. Additionally, it mentions that he often stays late in the library to work on his projects, which implies dedication.",
            verdict: 1,
          },
          {
            statement: "John has a part-time job.",
            reason:
              "There is no information given in the context about John having a part-time job.",
            verdict: 0,
          },
        ],
      },
    },
    {
      input: {
        context:
          "Photosynthesis is a process used by plants, algae, and certain bacteria to convert light energy into chemical energy.",
        statements: [{ statement: "Albert Einstein was a genius." }],
      },
      output: {
        statements: [
          {
            statement: "Albert Einstein was a genius.",
            reason: "The context and statement are unrelated",
            verdict: 0,
          },
        ],
      },
    },
  ],
  task: ["context", "statements"],
});

/**
 * Prompt for simple NLI evaluation (verdicts only, no reasons)
 */
export const simpleNLIPrompt = promptBuilder({
  prompt:
    "Your task is to judge whether each statement can be directly inferred from the given context. Return 1 if the statement is supported by the context, or 0 if it is not. Only return the array of verdicts.",
  examples: [
    {
      input: {
        context:
          "John is a student at XYZ University pursuing a degree in Computer Science.",
        statements: [
          "John is majoring in Biology.",
          "John is a student.",
          "John studies at XYZ University.",
        ],
      },
      output: {
        verdicts: [0, 1, 1],
      },
    },
  ],
  task: ["context", "statements"],
});

/**
 * Decomposes a text into atomic statements given a question
 */
export async function decomposeIntoStatements(
  question: string,
  answer: string,
  model: LanguageModel
): Promise<string[]> {
  const result = await generateObject({
    model: model,
    schema: StatementGeneratorOutputSchema,
    prompt: generateStatementsPrompt({ question, answer }),
  });

  return result.object.statements;
}

/**
 * Evaluates statements against context with detailed verdicts and reasons
 */
export async function evaluateStatementFaithfulness(
  context: string,
  statements: string[],
  model: LanguageModel
): Promise<Evalite.Scorers.FaithfulnessStatements> {
  const result = await generateObject({
    model: model,
    schema: FaithfulnessStatementsOutputSchema,
    prompt: evaluateStatementsPrompt({
      context,
      statements: statements.map((s) => ({ statement: s })),
    }),
  });

  return result.object.statements.map((s) => ({
    statement: s.statement,
    reason: s.reason,
    verdict: s.verdict,
  }));
}

/**
 * Evaluates statements against context with simple verdicts (0/1 only)
 */
export async function evaluateStatementsSimple(
  context: string,
  statements: string[],
  model: LanguageModel
): Promise<number[]> {
  const result = await generateObject({
    model: model,
    schema: SimpleVerdictOutputSchema,
    prompt: simpleNLIPrompt({
      context,
      statements,
    }),
  });

  return result.object.verdicts;
}

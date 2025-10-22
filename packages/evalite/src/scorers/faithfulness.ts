import { createScorer } from "../create-scorer.js";
import { createLLMBasedScorer } from "./base.js";
import { generateObject } from "ai";
import { z } from "zod";
import { isSingleTurnSample } from "./utils.js";

const StatementGeneratorOutputSchema = z.object({
  statements: z.array(z.string()).describe("The generated statements"),
});

const StatementFaithfulnessAnswerSchema = z.object({
  statement: z.string().describe("the original statement, word-by-word"),
  reason: z.string().describe("the reason of the verdict"),
  verdict: z
    .number()
    .int()
    .min(0)
    .max(1)
    .describe("the verdict (0/1) of the faithfulness"),
});

const NLIStatementOutputSchema = z.object({
  statements: z.array(StatementFaithfulnessAnswerSchema),
});

type NLIStatementOutput = z.infer<typeof NLIStatementOutputSchema>;

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
export const faithfulness = createLLMBasedScorer(({ model }) => {
  return createScorer({
    name: "Faithfulness",
    description:
      "Evaluates the faithfulness of the model's response to the retrieved contexts",
    async scorer({ input, output }) {
      if (!isSingleTurnSample(input))
        throw new Error(
          "Faithfulness scorer only supports single turn samples"
        );

      if (!input.retrievedContexts)
        throw new Error("No retrieved contexts provided");

      const statements = await generateStatements(input.query, output);
      if (statements.statements.length === 0)
        throw new Error("No statements were generated from the answer");

      const verdicts = await evaluateStatements(
        input.retrievedContexts,
        statements.statements
      );

      return {
        score: await computeScore(verdicts),
        metadata: verdicts.statements.map((v) => ({
          statement: v.statement,
          reason: v.reason,
          verdict: v.verdict,
        })),
      };
    },
  });

  async function computeScore(verdicts: NLIStatementOutput) {
    if (verdicts.statements.length === 0) {
      return 0;
    }

    const faithfulVerdicts = verdicts.statements.filter(
      (v) => v.verdict === 1
    ).length;
    return faithfulVerdicts / verdicts.statements.length;
  }

  async function generateStatements(question: string, answer: string) {
    const result = await generateObject({
      model: model,
      schema: StatementGeneratorOutputSchema,
      prompt: `
<instructions>
Given a question and an answer, analyze the complexity of each sentence in the answer. Break down each sentence into one or more fully understandable statements. Ensure that no pronouns are used in any statement. Format the outputs in JSON.
</instructions>

<example>
<question>Who was Albert Einstein and what is he best known for?</question>
<answer>He was a German-born theoretical physicist, widely acknowledged to be one of the greatest and most influential physicists of all time. He was best known for developing the theory of relativity, he also made important contributions to the development of the theory of quantum mechanics.</answer>

<expected_output>
{
  "statements": [
    "Albert Einstein was a German-born theoretical physicist.",
    "Albert Einstein is recognized as one of the greatest and most influential physicists of all time.",
    "Albert Einstein was best known for developing the theory of relativity.",
    "Albert Einstein also made important contributions to the development of the theory of quantum mechanics."
  ]
}
</expected_output>
</example>

<task>
<question>${question}</question>
<answer>${answer}</answer>
</task>`.trim(),
    });

    return result.object;
  }

  async function evaluateStatements(contexts: string[], statements: string[]) {
    const context = contexts.join("\n");

    const result = await generateObject({
      model: model,
      schema: NLIStatementOutputSchema,
      prompt: `
<instructions>
Your task is to judge the faithfulness of a series of statements based on a given context. For each statement you must return verdict as 1 if the statement can be directly inferred based on the context or 0 if the statement can not be directly inferred based on the context.
</instructions>

<examples>
<example>
<context>
John is a student at XYZ University. He is pursuing a degree in Computer Science. He is enrolled in several courses this semester, including Data Structures, Algorithms, and Database Management. John is a diligent student and spends a significant amount of time studying and completing assignments. He often stays late in the library to work on his projects.
</context>

<statements>
1. "John is majoring in Biology."
2. "John is taking a course on Artificial Intelligence."
3. "John is a dedicated student."
4. "John has a part-time job."
</statements>

<expected_output>
{
  "statements": [
    {
      "statement": "John is majoring in Biology.",
      "reason": "John's major is explicitly mentioned as Computer Science. There is no information suggesting he is majoring in Biology.",
      "verdict": 0
    },
    {
      "statement": "John is taking a course on Artificial Intelligence.",
      "reason": "The context mentions the courses John is currently enrolled in, and Artificial Intelligence is not mentioned. Therefore, it cannot be deduced that John is taking a course on AI.",
      "verdict": 0
    },
    {
      "statement": "John is a dedicated student.",
      "reason": "The context states that he spends a significant amount of time studying and completing assignments. Additionally, it mentions that he often stays late in the library to work on his projects, which implies dedication.",
      "verdict": 1
    },
    {
      "statement": "John has a part-time job.",
      "reason": "There is no information given in the context about John having a part-time job.",
      "verdict": 0
    }
  ]
}
</expected_output>
</example>

<example>
<context>
Photosynthesis is a process used by plants, algae, and certain bacteria to convert light energy into chemical energy.
</context>

<statements>
1. "Albert Einstein was a genius."
</statements>

<expected_output>
{
  "statements": [
    {
      "statement": "Albert Einstein was a genius.",
      "reason": "The context and statement are unrelated",
      "verdict": 0
    }
  ]
}
</expected_output>
</example>
</examples>

<task>
<context>
${context}
</context>

<statements>
${statements.map((s, i) => `${i + 1}. "${s}"`).join("\n")}
</statements>
</task>`.trim(),
    });

    return result.object;
  }
});

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { evalite } from "evalite";
import { wrapAISDKModel } from "evalite/ai-sdk";
import { answerRelevancy } from "evalite/scorers";

const model = wrapAISDKModel(openai("gpt-4.1-mini"));

/**
 * Test eval to validate Braintrust storage integration with LLM calls
 * and LLM-as-a-judge scoring
 */
evalite("Braintrust Storage Test", {
  data: () => [
    {
      input: "What is the capital of France?",
      expected: "Paris",
    },
    {
      input: "What is the capital of Japan?",
      expected: "Tokyo",
    },
    {
      input: "What is the capital of Germany?",
      expected: "Berlin",
    },
  ],
  task: async (input) => {
    const result = await generateText({
      model,
      prompt: input,
      system:
        "You are a geography assistant. Answer with just the city name, nothing else.",
    });
    return result.text;
  },
  scorers: [
    {
      name: "exact_match",
      scorer: ({ output, expected }) => {
        const normalizedOutput = output.trim().toLowerCase();
        const normalizedExpected = expected.trim().toLowerCase();
        return normalizedOutput === normalizedExpected ? 1 : 0;
      },
    },
    {
      name: "Answer Relevancy",
      description:
        "LLM-as-a-judge: evaluates if the answer is relevant to the question",
      scorer: ({ input, output }) =>
        answerRelevancy({
          question: input,
          answer: output,
          model,
          embeddingModel: openai.embedding("text-embedding-3-small"),
        }),
    },
  ],
});

import { openai } from "@ai-sdk/openai";
import { evalite } from "evalite";
import { cacheModel } from "evalite/ai-sdk";
import { answerRelevancy, toolCallAccuracy } from "evalite/scorers";

evalite("Answer Relevancy", {
  data: [
    {
      input: "What is the capital of France?",
      expected: {
        referenceToolCalls: [],
      },
    },
    {
      input: "Who invented the telephone?",
      expected: {
        referenceToolCalls: [],
      },
    },
    {
      input: "What are the health benefits of exercise?",
      expected: {
        referenceToolCalls: [],
      },
    },
    {
      input: "How does photosynthesis work?",
      expected: {
        referenceToolCalls: [],
      },
    },
  ],
  task(input) {
    if (input.includes("capital of France")) {
      return "Paris is the capital of France. It's known for the Eiffel Tower and the Louvre Museum.";
    } else if (input.includes("telephone")) {
      return "Alexander Graham Bell is credited with inventing the telephone in 1876.";
    } else if (input.includes("health benefits")) {
      return "I don't know about that topic.";
    } else if (input.includes("photosynthesis")) {
      return "Photosynthesis is the process by which plants convert light energy into chemical energy.";
    }
    return "I'm not sure about that.";
  },
  scorers: [
    {
      name: "Answer Relevancy",
      description: "Evaluates answer relevancy",
      scorer: ({ input, output }) =>
        answerRelevancy({
          question: input,
          answer: output,
          model: cacheModel(openai("gpt-4.1-mini")),
          embeddingModel: openai.embedding("text-embedding-3-small"),
        }),
    },
  ],
});

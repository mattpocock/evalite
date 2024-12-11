import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createScorer, evalite } from "evalite";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { cacheModel } from "./cache-model";
import { traceAISDKModel } from "evalite/ai-sdk";

const storage = createStorage({
  driver: (fsDriver as any)({
    base: "./llm-cache.local",
  }),
});

evalite("Content generation", {
  data: async () => {
    return [
      {
        input: "Write a tweet on how to type React props",
      },
      {
        input: "Write a tweet about TypeScript template literal types.",
      },
      {
        input: 'Write a tweet about "TypeScript is a superset of JavaScript."',
      },
      {
        input: "Write a tweet about TypeScript utility types.",
      },
    ];
  },
  task: async (input) => {
    const result = await generateText({
      model: traceAISDKModel(cacheModel(openai("gpt-4o-mini"), storage)),
      prompt: input,
      system: `
        You are a social media assistant.
        You will be asked to write a tweet on a given topic.
        Return only the tweet.
        Do not use emojis.
        Never use hashtags.
        Use code examples if needed.

        <banned-phrases>

        These phrases are banned from your vocabulary:

        - Type safety
        - Flexibility
        - Code quality
        - Maintanability
        - Enhance code structure

        </banned-phrases>

        <react-advice>

        1. When typing React props, do not use React.FC.
        2. When typing React props, use interfaces.
        3. When typing React props, I prefer not to destructure the props.

        </react-advice>

        <typescript-advice>

        - Template literal types were released in TypeScript 4.1.
        - The latest version of TypeScript is 5.7.
        - Template literal types are different from template literals at runtime.
        - You can pass a union of strings to a template literal type to get a union back.
        - You can use Capitalize, Uppercase, Lowercase, and Uncapitalize to transform strings.

        </typescript-advice>
      `,
    });

    return result.text;
  },
  scorers: [
    createScorer({
      name: "No Hashtags",
      scorer: ({ output }) => {
        return output.includes("#") ? 0 : 1;
      },
    }),
    createScorer({
      name: "No React.FC in code examples",
      scorer: ({ output }) => {
        const codeExamples = output.match(/```[\s\S]*?```/g) || [];

        if (codeExamples.length === 0) {
          return 1;
        }

        return codeExamples.every((code) => !code.includes("React.FC")) ? 1 : 0;
      },
    }),
  ],
});

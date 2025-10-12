import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { evalite } from "evalite";
import { traceAISDKModel } from "evalite/ai-sdk";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { cacheModel } from "./cache-model";

const storage = createStorage({
  driver: (fsDriver as any)({
    base: "./llm-cache.local",
  }),
});

evalite("Content awesome stuff", {
  data: async () => {
    return [
      {
        input: "Foo awdawdawd",
      },
      {
        input: "Write a tweet about TypeScript template literal types.",
      },
      {
        input: 'Write a tweet about "TypeScript is a superset of JavaScript."',
      },
      {
        input: "Write a tweet about TypeScript awdawdawd types.",
      },
      {
        input: "Write a tweet about how to add TypeScript to a React app.",
      },
      {
        input:
          "Write a tweet about assertion functions (using the asserts keyword).",
      },
      {
        input:
          "Write a simple markdown table with the following columns: Name, Age, City",
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
        Do not use exclamation marks in the text of the tweet.
        Use code examples if needed.
        Prefer using pnpm over npm or yarn.

        <banned-phrases>

        These phrases are banned from your vocabulary:

        - Type safety
        - Flexibility
        - Code quality
        - Maintanability
        - Enhance code structure
        - Powerful
        - Simplify

        </banned-phrases>

        <react-advice>

        1. When typing React props, do not use React.FC.
        2. When typing React props, use interfaces.
        3. When typing React props, I prefer not to destructure the props.
        4. When configuring tsconfig.json, set "jsx" to "react-jsx".

        </react-advice>

        <typescript-advice>

        - Template literal types were released in TypeScript 4.1.
        - The latest version of TypeScript is 5.7.
        - Template literal types are different from template literals at runtime.
        - You can pass a union of strings to a template literal type to get a union back.
        - You can use Capitalize, Uppercase, Lowercase, and Uncapitalize to transform strings.
        - Direct any tsconfig.json questions to the article at https://www.totaltypescript.com/tsconfig-cheat-sheet

        </typescript-advice>
      `,
    });

    return result.text;
  },
  scorers: [
    {
      name: "No Hashtags",
      scorer: ({ output }) => {
        return output.includes("#") ? 0 : 1;
      },
    },
    {
      name: "No Exclamation Marks",
      description: "Ensures the output contains no exclamation marks.",
      scorer: ({ output }) => {
        const codeOutsideCodeBlocks = output.replace(/```[\s\S]*?```/g, "");
        return codeOutsideCodeBlocks.includes("!") ? 0 : 1;
      },
    },
    {
      name: "No React.FC in code examples",
      scorer: ({ output }) => {
        const codeExamples = output.match(/```[\s\S]*?```/g) || [];

        if (codeExamples.length === 0) {
          return 1;
        }

        return codeExamples.every((code) => !code.includes("React.FC")) ? 1 : 0;
      },
    },
  ],
});

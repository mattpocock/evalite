import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { evalite } from "evalite";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { Factuality } from "autoevals";
import { cacheModel } from "./cache-model.js";
import { traceAISDKModel } from "evalite/ai-sdk";

const storage = createStorage({
  driver: (fsDriver as any)({
    base: "./llm-cache.local",
  }),
});

evalite("Test Capitals 2", {
  data: async () => [
    {
      input: `What's the capital of France?`,
      expected: `Paris`,
    },
    {
      input: `What's the capital of Germany?`,
      expected: `Berlin`,
    },
    {
      input: `What's the capital of Italy?`,
      expected: `Rome`,
    },
    {
      input: `What's the capital of the United States?`,
      expected: `Washington DC`,
    },
    {
      input: `What's the capital of Canada?`,
      expected: `Ottawa`,
    },
    {
      input: `What's the capital of Japan?`,
      expected: `Tokyo`,
    },
    {
      input: 'What\'s the capital of "South Korea"?',
      expected: `Seoul`,
    },
  ],
  task: async (input) => {
    const result = await generateText({
      model: traceAISDKModel(cacheModel(openai("gpt-4o-mini"), storage)),
      system: `
        Answer the question concisely, in as few words as possible.
      `,
      prompt: input,
    });

    return result.text;
  },
  scorers: [Factuality],
});

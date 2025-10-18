import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { evalite } from "evalite";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { Factuality, Levenshtein } from "autoevals";
import { cacheModel } from "./cache-model.js";
import { traceAISDKModel } from "evalite/ai-sdk";

const storage = createStorage({
  driver: (fsDriver as any)({
    base: "./llm-cache.local",
  }),
});

evalite("Test Capitals", {
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
      expected: `Washington, D.C`,
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
      input: `What's the capital of Jamaica?`,
      expected: `Kingston`,
    },
    {
      input: `Name all the capitals of each part of the UK.`,
      expected: `London, Edinburgh, Cardiff, Belfast`,
    },
    {
      input: `What's the capital of Antarctica?`,
      expected: `Antarctica has no capital`,
    },
    {
      input: `What's the capital of Bonkersville?`,
      expected: "Unknown",
    },
  ],
  task: async (input) => {
    const result = await generateText({
      model: traceAISDKModel(cacheModel(openai("gpt-4o-mini"), storage)),
      system: `
        Answer the question concisely. Answer in as few words as possible.
        Remove full stops from the end of the output.
        If the country has no capital, return '<country> has no capital'.
        If the country does not exist, return 'Unknown'.
      `,
      prompt: input,
    });

    return result.text;
  },
  scorers: [Factuality, Levenshtein],
});

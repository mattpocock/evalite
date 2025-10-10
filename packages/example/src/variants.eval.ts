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

evalite.each({
  "GPT-4o mini": { model: "gpt-4o-mini", temp: 0.7 },
  "GPT-4o": { model: "gpt-4o", temp: 0.7 },
  "GPT-4o mini (temp 0)": { model: "gpt-4o-mini", temp: 0 },
})("Compare models", {
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
      input: `What's the capital of Japan?`,
      expected: `Tokyo`,
    },
    {
      input: `What's the capital of Canada?`,
      expected: `Ottawa`,
    },
  ],
  task: async (input, variant) => {
    const result = await generateText({
      model: traceAISDKModel(cacheModel(openai(variant.model), storage)),
      temperature: variant.temp,
      system: `
        Answer the question concisely. Answer in as few words as possible.
        Remove full stops from the end of the output.
      `,
      prompt: input,
    });

    return result.text;
  },
  scorers: [Factuality, Levenshtein],
});

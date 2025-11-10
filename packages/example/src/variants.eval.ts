import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { evalite } from "evalite";
import { exactMatch } from "evalite/scorers";
import { cacheModel, traceAISDKModel } from "evalite/ai-sdk";

evalite.each([
  { name: "GPT-4o mini", input: { model: openai("gpt-4o-mini"), temp: 0.7 } },
  { name: "GPT-4o", input: { model: openai("gpt-4o"), temp: 0.7 } },
  {
    name: "GPT-4o mini (temp 0)",
    input: { model: openai("gpt-4o-mini"), temp: 0 },
  },
])("Compare models", {
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
      model: traceAISDKModel(cacheModel(variant.model)),
      temperature: variant.temp,
      system: `
        Answer the question concisely. Answer in as few words as possible.
        Remove full stops from the end of the output.
      `,
      prompt: input,
    });

    return result.text;
  },
  scorers: [
    {
      scorer: ({ output, expected }) =>
        exactMatch({ actual: output, expected }),
    },
  ],
});

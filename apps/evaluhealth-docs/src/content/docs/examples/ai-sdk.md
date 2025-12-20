---
title: AI SDK
---

Vercel's [AI SDK](https://sdk.vercel.ai/docs/introduction) is a great way to get started with AI in your apps.

It abstracts away the differences between different AI providers, so you can **switch between them easily**.

## Tracing

You can use the `traceAISDKModel` function to trace the calls to the AI SDK:

```ts
// my-eval.eval.ts

import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Factuality, Levenshtein } from "autoevals";
import { evaluhealth } from "evaluhealth";
import { traceAISDKModel } from "evaluhealth/ai-sdk";

evaluhealth("Test Capitals", {
  data: async () => [
    {
      input: `What's the capital of France?`,
      expected: `Paris`,
    },
    {
      input: `What's the capital of Germany?`,
      expected: `Berlin`,
    },
  ],
  task: async (input) => {
    const result = streamText({
      model: traceAISDKModel(openai("gpt-4o-mini")),
      system: `
        Answer the question concisely. Answer in as few words as possible.
        Remove full stops from the end of the output.
        If the country has no capital, return '<country> has no capital'.
        If the country does not exist, return 'Unknown'.
      `,
      prompt: input,
    });

    return await result.text;
  },
  scorers: [Factuality, Levenshtein],
});
```

## Testing Whole Conversations

You can also pass messages to the `input` property of the eval. To get autocomplete, you can pass the `CoreMessage` type to the `evaluhealth` function as a type argument.

The three type parameters for `evaluhealth` are:

- The type of the input
- The type of the output
- The type of the expected output (optional)

```ts
// my-eval.eval.ts

import { openai } from "@ai-sdk/openai";
import { streamText, type CoreMessage } from "ai";
import { Levenshtein } from "autoevals";
import { evaluhealth } from "evaluhealth";
import { traceAISDKModel } from "evaluhealth/ai-sdk";

evaluhealth<CoreMessage[], string, string>("Test Capitals", {
  data: async () => [
    {
      input: [
        {
          content: `What's the capital of France?`,
          role: "user",
        },
      ],
      expected: `Paris`,
    },
  ],
  task: async (input) => {
    const result = streamText({
      model: traceAISDKModel(openai("gpt-4o-mini")),
      system: `
        Answer the question concisely. Answer in as few words as possible.
        Remove full stops from the end of the output.
        If the country has no capital, return '<country> has no capital'.
        If the country does not exist, return 'Unknown'.
      `,
      messages: input,
    });

    return await result.text;
  },
  scorers: [Levenshtein],
});
```

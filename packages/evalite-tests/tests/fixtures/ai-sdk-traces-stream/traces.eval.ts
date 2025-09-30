import { streamText, simulateReadableStream } from "ai";
import { MockLanguageModelV2 } from "ai/test";
import { Levenshtein } from "autoevals";
import { evalite } from "evalite";
import { traceAISDKModel } from "evalite/ai-sdk";

const model = new MockLanguageModelV2({
  doStream: async (options) => ({
    stream: simulateReadableStream({
      chunks: [
        { type: "text-delta", id: "1", delta: "Hello" },
        { type: "text-delta", id: "1", delta: ", " },
        { type: "text-delta", id: "1", delta: `world!` },
        {
          type: "finish",
          finishReason: "stop",
          logprobs: undefined,
          usage: { outputTokens: 10, inputTokens: 3, totalTokens: 13 },
        },
      ],
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
    request: undefined,
    response: undefined,
  }),
});

const tracedModel = traceAISDKModel(model);

evalite("AI SDK Traces", {
  data: () => {
    return [
      {
        input: "abc",
        expected: "abcdef",
      },
    ];
  },
  task: async (input) => {
    const result = await streamText({
      model: tracedModel,
      system: "Test system",
      prompt: input,
    });
    return result.textStream;
  },
  scorers: [Levenshtein],
});

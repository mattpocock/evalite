import { generateText } from "ai";
import { MockLanguageModelV2 } from "ai/test";
import { Levenshtein } from "autoevals";
import { evalite } from "evalite";
import { traceAISDKModel } from "evalite/ai-sdk";

const model = new MockLanguageModelV2({
  doGenerate: async (options) => ({
    text: "Hello, world!",
    finishReason: "stop",
    usage: { outputTokens: 10, inputTokens: 3, totalTokens: 14 },
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
    const result = await generateText({
      model: tracedModel,
      system: "Test system",
      prompt: input,
    });
    return result.text;
  },
  scorers: [Levenshtein],
});

import { generateText } from "ai";
import { MockLanguageModelV2 } from "ai/test";
import { traceAISDKModel } from "evaluhealth/ai-sdk";
import { evaluhealth } from "evaluhealth";
import { Levenshtein } from "autoevals";

const model = new MockLanguageModelV2({
  doGenerate: async (options) => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: "stop",
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 35 },
    content: [
      { type: "text", text: `Hello, world!` },
      {
        type: "tool-call",
        input: "{}",
        toolCallId: "abc",
        toolName: "myToolCall",
      },
    ],
    warnings: [],
    providerMetadata: undefined,
    request: undefined,
    response: undefined,
  }),
});

const tracedModel = traceAISDKModel(model);

evaluhealth("AI SDK Traces", {
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

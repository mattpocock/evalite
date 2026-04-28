import { generateText } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { wrapAISDKModel } from "evalite/ai-sdk";
import { evalite } from "evalite";

const model = new MockLanguageModelV3({
  doGenerate: {
    finishReason: { unified: "stop", raw: undefined },
    usage: {
      inputTokens: {
        total: 10,
        noCache: undefined,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: { total: 20, text: undefined, reasoning: undefined },
    },
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
  },
});

const tracedModel = wrapAISDKModel(model);

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
  scorers: [
    {
      name: "Pass",
      scorer: () => ({ score: 1 }),
    },
  ],
});

import { MockLanguageModelV2 } from "ai/test";
import { Levenshtein } from "autoevals";
import { evalite } from "evalite";
import { traceAISDKModel } from "evalite/ai-sdk";

const model = new MockLanguageModelV2({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: "stop",
    usage: { inputTokens: 8, outputTokens: 4, totalTokens: 12 },
    content: [{ type: "text", text: "4" }],
    warnings: [],
    providerMetadata: undefined,
    request: undefined,
    response: undefined,
  }),
});

const tracedModel = traceAISDKModel(model);

evalite("AI SDK Traces Reasoning", {
  data: () => {
    return [
      {
        input: "What is 2 + 2?",
        expected: "4",
      },
    ];
  },
  task: async (input) => {
    const result = await tracedModel.doGenerate({
      prompt: [
        {
          role: "user",
          content: [{ type: "text", text: input }],
        },
        {
          role: "assistant",
          content: [
            {
              type: "reasoning",
              text: "private reasoning should not be persisted",
            },
            {
              type: "text",
              text: "I should use the calculator.",
            },
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "calculator",
              input: { expression: "2 + 2" },
            },
          ],
        },
        {
          role: "assistant",
          content: [
            {
              type: "reasoning",
              text: "this whole message should be dropped",
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "call-1",
              toolName: "calculator",
              output: { type: "text", value: "4" },
            },
          ],
        },
      ],
    } as any);

    return result.content
      .filter((content) => content.type === "text")
      .map((content) => content.text)
      .join("");
  },
  scorers: [Levenshtein],
});

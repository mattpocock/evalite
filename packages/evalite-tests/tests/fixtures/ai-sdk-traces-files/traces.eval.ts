import { generateText } from "ai";
import { MockLanguageModelV1 } from "ai/test";
import { traceAISDKModel } from "evalite/ai-sdk";
import { evalite } from "evalite";
import { Levenshtein } from "autoevals";
import { readFileSync } from "fs";
import path from "path";

const model = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: "stop",
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Hello, world!`,
    toolCalls: [
      {
        args: "{}",
        toolCallId: "abc",
        toolCallType: "function",
        toolName: "myToolCall",
      },
    ],
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
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: input },
            {
              type: "file",
              mimeType: "image/png",
              data: readFileSync(path.join(import.meta.dirname, "test.png")),
            },
            {
              type: "image",
              mimeType: "image/png",
              image: readFileSync(path.join(import.meta.dirname, "test.png")),
            },
          ],
        },
      ],
    });
    return result.text;
  },
  scorers: [Levenshtein],
});

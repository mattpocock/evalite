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
    content: [{ type: "text", text: "Response after reasoning" }],
    warnings: [],
  },
});

const tracedModel = wrapAISDKModel(model);

evalite("AI SDK Reasoning", {
  data: () => {
    return [
      {
        input: "What is 2+2?",
        expected: "4",
      },
    ];
  },
  task: async (input) => {
    const result = await generateText({
      model: tracedModel,
      messages: [
        { role: "user", content: "question" },
        {
          role: "assistant",
          content: [
            { type: "reasoning", text: "Let me think about this..." },
            { type: "text", text: "Previous response" },
          ],
        },
        { role: "user", content: input },
      ],
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

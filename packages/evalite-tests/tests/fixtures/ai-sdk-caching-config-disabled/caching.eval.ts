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
    content: [{ type: "text", text: `Response for task` }],
    warnings: [],
  },
});

const scorerModel = new MockLanguageModelV3({
  doGenerate: {
    finishReason: { unified: "stop", raw: undefined },
    usage: {
      inputTokens: {
        total: 5,
        noCache: undefined,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: { total: 10, text: undefined, reasoning: undefined },
    },
    content: [{ type: "text", text: `1` }],
    warnings: [],
  },
});

const tracedModel = wrapAISDKModel(model);
const tracedScorerModel = wrapAISDKModel(scorerModel);

evalite("AI SDK Caching Config Disabled", {
  data: () => {
    return [
      {
        input: "test input 1",
        expected: "expected output 1",
      },
    ];
  },
  task: async (input) => {
    const result = await generateText({
      model: tracedModel,
      prompt: input,
    });
    return result.text;
  },
  scorers: [
    {
      name: "AI Scorer",
      scorer: async ({ input, output, expected }) => {
        const result = await generateText({
          model: tracedScorerModel,
          prompt: `Score this: ${output}`,
        });
        return { score: 1 };
      },
    },
  ],
});

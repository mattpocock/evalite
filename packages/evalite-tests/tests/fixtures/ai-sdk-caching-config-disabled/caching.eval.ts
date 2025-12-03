import { generateText } from "ai";
import { MockLanguageModelV2 } from "ai/test";
import { wrapAISDKModel } from "evalite/ai-sdk";
import { evalite } from "evalite";

const model = new MockLanguageModelV2({
  doGenerate: async (options) => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: "stop",
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    content: [{ type: "text", text: `Response for task` }],
    warnings: [],
    providerMetadata: undefined,
    request: undefined,
    response: undefined,
  }),
});

const scorerModel = new MockLanguageModelV2({
  doGenerate: async (options) => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: "stop",
    usage: { inputTokens: 5, outputTokens: 10, totalTokens: 15 },
    content: [{ type: "text", text: `1` }],
    warnings: [],
    providerMetadata: undefined,
    request: undefined,
    response: undefined,
  }),
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

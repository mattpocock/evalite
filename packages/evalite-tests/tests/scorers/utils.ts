import { MockLanguageModelV2, MockEmbeddingModelV2 } from "ai/test";

export const createMockModel = <T = unknown>(responses: T[]) => {
  let callIndex = 0;
  return new MockLanguageModelV2({
    doGenerate: async () => {
      const response = responses[callIndex++] || {};
      const content = JSON.stringify(response);

      return {
        rawCall: { rawPrompt: null, rawSettings: {} },
        finishReason: "stop" as const,
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        content: [{ type: "text" as const, text: content }],
        warnings: [],
        providerMetadata: undefined,
        request: undefined,
        response: undefined,
      };
    },
  });
};

export const createMockEmbeddingModel = (embeddings: number[][]) => {
  let callIndex = 0;
  return new MockEmbeddingModelV2({
    doEmbed: async ({ values }) => {
      const result = values.map(() => {
        return embeddings[callIndex++] || [0, 0, 0];
      });
      return {
        embeddings: result,
        usage: { tokens: 10 },
        rawResponse: undefined,
      };
    },
  });
};

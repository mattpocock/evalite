import { describe, it, expect } from "vitest";
import { answerRelevancy } from "evalite/scorers";
import type { Evalite } from "evalite";
import { MockLanguageModelV2, MockEmbeddingModelV2 } from "ai/test";
import { createMockModel, createMockEmbeddingModel } from "./utils.js";

describe("answerRelevancy scorer", () => {
  describe("relevant answers", () => {
    it("should return high score for highly relevant answer", async () => {
      const model = createMockModel([
        { question: "What is the capital of France?", noncommittal: 0 },
        { question: "Which city is France's capital?", noncommittal: 0 },
        {
          question: "What city serves as the capital of France?",
          noncommittal: 0,
        },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [0.95, 0.05, 0],
        [0.9, 0.1, 0],
        [0.92, 0.08, 0],
      ]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital of France.",
        expected: {},
      });

      expect(result.score).toBeGreaterThan(0.85);
      expect(result.score).toBeLessThanOrEqual(1.0);
    });

    it("should return perfect score when generated questions match original", async () => {
      const model = createMockModel([
        { question: "What is the capital of France?", noncommittal: 0 },
        { question: "What is the capital of France?", noncommittal: 0 },
        { question: "What is the capital of France?", noncommittal: 0 },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0],
      ]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "The capital of France is Paris.",
        expected: {},
      });

      expect(result.score).toBe(1.0);
    });
  });

  describe("irrelevant answers", () => {
    it("should return low score for irrelevant answer", async () => {
      const model = createMockModel([
        { question: "What is the Eiffel Tower?", noncommittal: 0 },
        { question: "Where is the Eiffel Tower located?", noncommittal: 0 },
        { question: "What is a famous landmark in Paris?", noncommittal: 0 },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [0.2, 0.8, 0],
        [0.15, 0.85, 0],
        [0.3, 0.7, 0],
      ]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "The Eiffel Tower is a famous landmark in Paris.",
        expected: {},
      });

      expect(result.score).toBeLessThan(0.4);
    });

    it("should return very low score for completely irrelevant answer", async () => {
      const model = createMockModel([
        { question: "What is the largest ocean?", noncommittal: 0 },
        { question: "Which ocean covers the most area?", noncommittal: 0 },
        { question: "What ocean is the biggest?", noncommittal: 0 },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0.95, 0.05],
        [0, 0.9, 0.1],
      ]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "The Pacific Ocean is the largest ocean on Earth.",
        expected: {},
      });

      expect(result.score).toBeLessThan(0.2);
    });
  });

  describe("noncommittal answers", () => {
    it("should return 0 for noncommittal answer", async () => {
      const model = createMockModel([
        { question: "What is the capital of France?", noncommittal: 1 },
        { question: "What is the capital of France?", noncommittal: 1 },
        { question: "What is the capital of France?", noncommittal: 1 },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0],
      ]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "I don't know the answer to that question.",
        expected: {},
      });

      expect(result.score).toBe(0);
    });

    it("should return non-zero for partially noncommittal answer", async () => {
      const model = createMockModel([
        { question: "What is the capital of France?", noncommittal: 0 },
        { question: "What is the capital of France?", noncommittal: 1 },
        { question: "What is the capital of France?", noncommittal: 0 },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [0.9, 0.1, 0],
        [0.85, 0.15, 0],
        [0.95, 0.05, 0],
      ]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "I'm not entirely sure, but I think it might be Paris.",
        expected: {},
      });

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1.0);
    });

    it("should detect 'I'm not sure' as noncommittal", async () => {
      const model = createMockModel([
        { question: "What is the answer?", noncommittal: 1 },
        { question: "What is being asked?", noncommittal: 1 },
        { question: "What information is needed?", noncommittal: 1 },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [0.8, 0.2, 0],
        [0.75, 0.25, 0],
        [0.85, 0.15, 0],
      ]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "Who invented the telephone?",
        output: "I'm not sure about that.",
        expected: {},
      });

      expect(result.score).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should return 0 for empty output", async () => {
      const model = createMockModel([]);
      const embeddingModel = createMockEmbeddingModel([]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "",
        expected: {},
      });

      expect(result.score).toBe(0);
    });

    it("should return 0 for whitespace-only output", async () => {
      const model = createMockModel([]);
      const embeddingModel = createMockEmbeddingModel([]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "   \n\t  ",
        expected: {},
      });

      expect(result.score).toBe(0);
    });

    it("should return 0 when no questions are generated", async () => {
      const model = createMockModel([
        { question: "", noncommittal: 0 },
        { question: "", noncommittal: 0 },
        { question: "", noncommittal: 0 },
      ]);

      const embeddingModel = createMockEmbeddingModel([]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Some response",
        expected: {},
      });

      expect(result.score).toBe(0);
    });

    it("should handle partial question generation failures gracefully", async () => {
      const model = new MockLanguageModelV2({
        doGenerate: async () => {
          throw new Error("Generation failed");
        },
      });

      const embeddingModel = createMockEmbeddingModel([]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital.",
        expected: {},
      });

      expect(result.score).toBe(0);
    });

    it("should handle null embeddings gracefully", async () => {
      const model = createMockModel([
        { question: "What is the capital?", noncommittal: 0 },
        { question: "Which city is the capital?", noncommittal: 0 },
        { question: "What is the capital city?", noncommittal: 0 },
      ]);

      const embeddingModel = new MockEmbeddingModelV2({
        doEmbed: async ({ values }) => {
          return {
            embeddings: values.map(() => undefined as any),
            usage: { tokens: 10 },
            rawResponse: undefined,
          };
        },
      });

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital of France.",
        expected: {},
      });

      expect(result.score).toBe(0);
    });

    it("should handle successful generation with some failures", async () => {
      let callCount = 0;
      const model = new MockLanguageModelV2({
        doGenerate: async () => {
          callCount++;
          if (callCount === 2) {
            throw new Error("Second call failed");
          }
          const response = {
            question: "What is the capital of France?",
            noncommittal: 0,
          };
          return {
            rawCall: { rawPrompt: null, rawSettings: {} },
            finishReason: "stop" as const,
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [
              { type: "text" as const, text: JSON.stringify(response) },
            ],
            warnings: [],
            providerMetadata: undefined,
            request: undefined,
            response: undefined,
          };
        },
      });

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [0.95, 0.05, 0],
        [0.9, 0.1, 0],
      ]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital of France.",
        expected: {},
      });

      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe("validation", () => {
    it("should throw error for empty input", async () => {
      const model = createMockModel([]);
      const embeddingModel = createMockEmbeddingModel([]);
      const scorer = answerRelevancy({ model, embeddingModel });

      await expect(
        scorer({
          input: "",
          output: "Some answer",
          expected: {},
        })
      ).rejects.toThrow(
        "Answer Relevancy scorer requires a non-empty string input"
      );
    });

    it("should throw error for whitespace-only input", async () => {
      const model = createMockModel([]);
      const embeddingModel = createMockEmbeddingModel([]);
      const scorer = answerRelevancy({ model, embeddingModel });

      await expect(
        scorer({
          input: "   \n  ",
          output: "Some answer",
          expected: {},
        })
      ).rejects.toThrow(
        "Answer Relevancy scorer requires a non-empty string input"
      );
    });

    it("should throw error for multi-turn output", async () => {
      const model = createMockModel([]);
      const embeddingModel = createMockEmbeddingModel([]);
      const scorer = answerRelevancy({ model, embeddingModel });

      await expect(
        scorer({
          input: "What is the capital?",
          output: [
            { role: "user", content: "What is the capital?" },
            { role: "assistant", content: "Paris" },
          ] as any,
          expected: {},
        })
      ).rejects.toThrow(
        "Answer Relevancy scorer does not support multi-turn outputs"
      );
    });
  });

  describe("metadata", () => {
    it("should return generated questions in metadata", async () => {
      const model = createMockModel([
        { question: "What is the capital of France?", noncommittal: 0 },
        { question: "Which city is France's capital?", noncommittal: 0 },
        {
          question: "What city serves as the capital of France?",
          noncommittal: 0,
        },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [0.95, 0.05, 0],
        [0.9, 0.1, 0],
        [0.92, 0.08, 0],
      ]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital of France.",
        expected: {},
      });

      const metadata =
        result.metadata as Evalite.Scorers.AnswerRelevancyMetadata;

      expect(metadata).toBeDefined();
      expect(metadata.generatedQuestions).toHaveLength(3);
      expect(metadata.generatedQuestions[0]).toBe(
        "What is the capital of France?"
      );
      expect(metadata.generatedQuestions[1]).toBe(
        "Which city is France's capital?"
      );
      expect(metadata.generatedQuestions[2]).toBe(
        "What city serves as the capital of France?"
      );
    });

    it("should return similarity scores in metadata", async () => {
      const model = createMockModel([
        { question: "Question 1", noncommittal: 0 },
        { question: "Question 2", noncommittal: 0 },
        { question: "Question 3", noncommittal: 0 },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [0.9, 0.1, 0],
        [0.8, 0.2, 0],
        [0.85, 0.15, 0],
      ]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "Original question",
        output: "Some answer",
        expected: {},
      });

      const metadata =
        result.metadata as Evalite.Scorers.AnswerRelevancyMetadata;

      expect(metadata.similarities).toHaveLength(3);
      expect(metadata.similarities[0]).toBeGreaterThan(0.8);
      expect(metadata.similarities[1]).toBeGreaterThan(0.6);
      expect(metadata.similarities[2]).toBeGreaterThan(0.7);
    });

    it("should indicate noncommittal status in metadata", async () => {
      const model = createMockModel([
        { question: "What?", noncommittal: 1 },
        { question: "What?", noncommittal: 1 },
        { question: "What?", noncommittal: 1 },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0],
      ]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the answer?",
        output: "I don't know.",
        expected: {},
      });

      const metadata =
        result.metadata as Evalite.Scorers.AnswerRelevancyMetadata;

      expect(metadata.allNoncommittal).toBe(true);
    });

    it("should indicate partial committal in metadata", async () => {
      const model = createMockModel([
        { question: "Question 1", noncommittal: 0 },
        { question: "Question 2", noncommittal: 1 },
        { question: "Question 3", noncommittal: 0 },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0],
      ]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the answer?",
        output: "Maybe it's this.",
        expected: {},
      });

      const metadata =
        result.metadata as Evalite.Scorers.AnswerRelevancyMetadata;

      expect(metadata.allNoncommittal).toBe(false);
    });

    it("should return empty arrays when output is empty", async () => {
      const model = createMockModel([]);
      const embeddingModel = createMockEmbeddingModel([]);

      const scorer = answerRelevancy({ model, embeddingModel });

      const result = await scorer({
        input: "What is the question?",
        output: "",
        expected: {},
      });

      const metadata =
        result.metadata as Evalite.Scorers.AnswerRelevancyMetadata;

      expect(metadata.generatedQuestions).toEqual([]);
      expect(metadata.similarities).toEqual([]);
      expect(metadata.allNoncommittal).toBe(false);
    });
  });
});

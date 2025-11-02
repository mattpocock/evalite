import { describe, it, expect } from "vitest";
import { answerCorrectness } from "evalite/scorers";
import type { Evalite } from "evalite";
import { MockLanguageModelV2, MockEmbeddingModelV2 } from "ai/test";

const createMockModel = (
  responses: Array<{
    statements?: string[];
    classification?: {
      TP: Array<{ statement: string; reason: string }>;
      FP: Array<{ statement: string; reason: string }>;
      FN: Array<{ statement: string; reason: string }>;
    };
  }>
) => {
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

const createMockEmbeddingModel = (embeddings: number[][]) => {
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

describe("answerCorrectness scorer", () => {
  describe("perfect match", () => {
    it("should return 1.0 when answer perfectly matches reference", async () => {
      const model = createMockModel([
        // First call: decompose response
        { statements: ["Paris is the capital of France."] },
        // Second call: decompose reference
        { statements: ["Paris is the capital of France."] },
        // Third call: classify statements
        {
          classification: {
            TP: [
              {
                statement: "Paris is the capital of France.",
                reason: "Statement matches reference exactly.",
              },
            ],
            FP: [],
            FN: [],
          },
        },
      ]);

      // Identical embeddings for perfect similarity
      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0], // reference
        [1, 0, 0], // response
      ]);

      const scorer = answerCorrectness({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital of France.",
        expected: {
          referenceAnswer: "Paris is the capital of France.",
        },
      });

      expect(result.score).toBe(1.0);
    });

    it("should return high score for semantically similar answers", async () => {
      const model = createMockModel([
        { statements: ["Paris is the capital of France."] },
        { statements: ["The capital of France is Paris."] },
        {
          classification: {
            TP: [
              {
                statement: "Paris is the capital of France.",
                reason: "Same meaning as reference.",
              },
            ],
            FP: [],
            FN: [],
          },
        },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0], // reference
        [0.95, 0.1, 0], // response (very similar)
      ]);

      const scorer = answerCorrectness({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital of France.",
        expected: {
          referenceAnswer: "The capital of France is Paris.",
        },
      });

      // With default weights [0.75, 0.25], factuality=1.0, similarity~0.95
      expect(result.score).toBeGreaterThan(0.95);
    });
  });

  describe("hallucinations (False Positives)", () => {
    it("should penalize hallucinated information", async () => {
      const model = createMockModel([
        {
          statements: [
            "Paris is the capital of France.",
            "Paris has a population of 50 million.",
          ],
        },
        { statements: ["Paris is the capital of France."] },
        {
          classification: {
            TP: [
              {
                statement: "Paris is the capital of France.",
                reason: "Matches reference.",
              },
            ],
            FP: [
              {
                statement: "Paris has a population of 50 million.",
                reason: "Not mentioned in reference and factually incorrect.",
              },
            ],
            FN: [],
          },
        },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0], // reference
        [0.8, 0.2, 0], // response (somewhat similar)
      ]);

      const scorer = answerCorrectness({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output:
          "Paris is the capital of France. Paris has a population of 50 million.",
        expected: {
          referenceAnswer: "Paris is the capital of France.",
        },
      });

      // Factuality: TP=1, FP=1, FN=0 → Precision=0.5, Recall=1.0, F1=0.67
      // With default weights [0.75, 0.25]: 0.75*0.67 + 0.25*0.8 ≈ 0.7
      expect(result.score).toBeLessThan(0.8);
      expect(result.score).toBeGreaterThan(0.5);
    });

    it("should score 0 when answer is completely hallucinated", async () => {
      const model = createMockModel([
        { statements: ["Berlin is the capital of France."] },
        { statements: ["Paris is the capital of France."] },
        {
          classification: {
            TP: [],
            FP: [
              {
                statement: "Berlin is the capital of France.",
                reason: "Completely incorrect information.",
              },
            ],
            FN: [
              {
                statement: "Paris is the capital of France.",
                reason: "Missing from the answer.",
              },
            ],
          },
        },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0], // reference
        [0, 1, 0], // response (completely different)
      ]);

      const scorer = answerCorrectness({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Berlin is the capital of France.",
        expected: {
          referenceAnswer: "Paris is the capital of France.",
        },
      });

      // Factuality: TP=0, FP=1, FN=1 → F1=0
      // Similarity is also low
      expect(result.score).toBeLessThan(0.3);
    });
  });

  describe("missing information (False Negatives)", () => {
    it("should penalize missing information", async () => {
      const model = createMockModel([
        { statements: ["Alexander Graham Bell invented the telephone."] },
        {
          statements: [
            "Alexander Graham Bell invented the telephone.",
            "The telephone was patented in 1876.",
          ],
        },
        {
          classification: {
            TP: [
              {
                statement: "Alexander Graham Bell invented the telephone.",
                reason: "Matches reference.",
              },
            ],
            FP: [],
            FN: [
              {
                statement: "The telephone was patented in 1876.",
                reason: "Missing from answer.",
              },
            ],
          },
        },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0.5, 0], // reference
        [1, 0, 0], // response (missing some info)
      ]);

      const scorer = answerCorrectness({ model, embeddingModel });

      const result = await scorer({
        input: "Who invented the telephone?",
        output: "Alexander Graham Bell invented the telephone.",
        expected: {
          referenceAnswer:
            "Alexander Graham Bell invented the telephone. The telephone was patented in 1876.",
        },
      });

      // Factuality: TP=1, FP=0, FN=1 → Precision=1.0, Recall=0.5, F1=0.67
      expect(result.score).toBeLessThan(0.9);
      expect(result.score).toBeGreaterThan(0.5);
    });
  });

  describe("custom weights", () => {
    it("should allow higher weight on factuality", async () => {
      const model = createMockModel([
        { statements: ["Paris is the capital of France."] },
        { statements: ["Paris is the capital of France."] },
        {
          classification: {
            TP: [
              {
                statement: "Paris is the capital of France.",
                reason: "Perfect match.",
              },
            ],
            FP: [],
            FN: [],
          },
        },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0], // reference
        [0.5, 0.5, 0], // response (lower similarity)
      ]);

      const scorer = answerCorrectness({
        model,
        embeddingModel,
        weights: [0.9, 0.1], // 90% factuality, 10% similarity
      });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital of France.",
        expected: {
          referenceAnswer: "Paris is the capital of France.",
        },
      });

      // Factuality=1.0, Similarity~0.5 → 0.9*1.0 + 0.1*0.5 = 0.95
      expect(result.score).toBeGreaterThan(0.9);
    });

    it("should allow higher weight on similarity", async () => {
      const model = createMockModel([
        {
          statements: ["Paris is the capital of France.", "Extra information."],
        },
        { statements: ["Paris is the capital of France."] },
        {
          classification: {
            TP: [
              {
                statement: "Paris is the capital of France.",
                reason: "Matches.",
              },
            ],
            FP: [
              {
                statement: "Extra information.",
                reason: "Not in reference.",
              },
            ],
            FN: [],
          },
        },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0], // reference
        [0.95, 0.05, 0], // response (high similarity)
      ]);

      const scorer = answerCorrectness({
        model,
        embeddingModel,
        weights: [0.1, 0.9], // 10% factuality, 90% similarity
      });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital of France. Extra information.",
        expected: {
          referenceAnswer: "Paris is the capital of France.",
        },
      });

      // Factuality~0.67 (TP=1, FP=1), Similarity~0.95 → 0.1*0.67 + 0.9*0.95 ≈ 0.92
      expect(result.score).toBeGreaterThan(0.85);
    });
  });

  describe("F-beta parameter", () => {
    it("should favor recall when beta > 1", async () => {
      // Beta = 2.0 favors recall
      const scorerHighBeta = answerCorrectness({
        model: createMockModel([
          { statements: ["Paris is the capital of France."] },
          {
            statements: [
              "Paris is the capital of France.",
              "It is located in northern France.",
            ],
          },
          {
            classification: {
              TP: [
                {
                  statement: "Paris is the capital of France.",
                  reason: "Matches.",
                },
              ],
              FP: [],
              FN: [
                {
                  statement: "It is located in northern France.",
                  reason: "Missing from answer.",
                },
              ],
            },
          },
        ]),
        embeddingModel: createMockEmbeddingModel([
          [1, 0, 0],
          [1, 0, 0],
        ]),
        beta: 2.0,
        weights: [1.0, 0.0], // Only factuality for clear comparison
      });

      const resultHighBeta = await scorerHighBeta({
        input: "What is the capital of France?",
        output: "Paris is the capital of France.",
        expected: {
          referenceAnswer:
            "Paris is the capital of France. It is located in northern France.",
        },
      });

      // TP=1, FP=0, FN=1 → Precision=1.0, Recall=0.5
      // F2 = 5 * (1.0 * 0.5) / (4*1.0 + 0.5) = 2.5 / 4.5 ≈ 0.56
      expect(resultHighBeta.score).toBeLessThan(0.7);
      expect(resultHighBeta.score).toBeGreaterThan(0.5);
    });

    it("should favor precision when beta < 1", async () => {
      const model = createMockModel([
        {
          statements: [
            "Paris is the capital of France.",
            "It has many museums.",
          ],
        },
        { statements: ["Paris is the capital of France."] },
        {
          classification: {
            TP: [
              {
                statement: "Paris is the capital of France.",
                reason: "Matches.",
              },
            ],
            FP: [
              {
                statement: "It has many museums.",
                reason: "Not in reference.",
              },
            ],
            FN: [],
          },
        },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [1, 0, 0],
      ]);

      // Beta = 0.5 favors precision
      const scorerLowBeta = answerCorrectness({
        model,
        embeddingModel,
        beta: 0.5,
        weights: [1.0, 0.0], // Only factuality for clear comparison
      });

      const resultLowBeta = await scorerLowBeta({
        input: "What is the capital of France?",
        output: "Paris is the capital of France. It has many museums.",
        expected: {
          referenceAnswer: "Paris is the capital of France.",
        },
      });

      // TP=1, FP=1, FN=0 → Precision=0.5, Recall=1.0
      // F0.5 = 1.25 * (0.5 * 1.0) / (0.25*0.5 + 1.0) = 0.625 / 1.125 ≈ 0.56
      expect(resultLowBeta.score).toBeLessThan(0.7);
      expect(resultLowBeta.score).toBeGreaterThan(0.5);
    });
  });

  describe("validation", () => {
    it("should throw error if referenceAnswer is missing", async () => {
      const model = createMockModel([]);
      const embeddingModel = createMockEmbeddingModel([]);
      const scorer = answerCorrectness({ model, embeddingModel });

      await expect(
        scorer({
          input: "What is the capital?",
          output: "Paris",
          expected: {} as any,
        })
      ).rejects.toThrow("Answer Correctness scorer requires");
    });

    it("should throw error for invalid weights", async () => {
      const model = createMockModel([]);
      const embeddingModel = createMockEmbeddingModel([]);
      const scorer = answerCorrectness({
        model,
        embeddingModel,
        weights: [0, 0, 0] as any,
      });

      await expect(
        scorer({
          input: "Test",
          output: "Answer",
          expected: { referenceAnswer: "Reference" },
        })
      ).rejects.toThrow("Weights must be an array of two numbers");
    });

    it("should throw error when all weights are zero", async () => {
      const model = createMockModel([]);
      const embeddingModel = createMockEmbeddingModel([]);
      const scorer = answerCorrectness({
        model,
        embeddingModel,
        weights: [0, 0],
      });

      await expect(
        scorer({
          input: "Test",
          output: "Answer",
          expected: { referenceAnswer: "Reference" },
        })
      ).rejects.toThrow("At least one weight must be non-zero");
    });

    it("should throw error for negative weights", async () => {
      const model = createMockModel([]);
      const embeddingModel = createMockEmbeddingModel([]);
      const scorer = answerCorrectness({
        model,
        embeddingModel,
        weights: [-0.5, 1.5],
      });

      await expect(
        scorer({
          input: "Test",
          output: "Answer",
          expected: { referenceAnswer: "Reference" },
        })
      ).rejects.toThrow("Weights must be non-negative");
    });

    it("should throw error for invalid beta", async () => {
      const model = createMockModel([]);
      const embeddingModel = createMockEmbeddingModel([]);
      const scorer = answerCorrectness({
        model,
        embeddingModel,
        beta: 0,
      });

      await expect(
        scorer({
          input: "Test",
          output: "Answer",
          expected: { referenceAnswer: "Reference" },
        })
      ).rejects.toThrow("Beta must be a positive number");
    });
  });

  describe("metadata", () => {
    it("should return detailed metadata", async () => {
      const model = createMockModel([
        { statements: ["Paris is the capital."] },
        { statements: ["Paris is the capital of France."] },
        {
          classification: {
            TP: [{ statement: "Paris is the capital.", reason: "Match." }],
            FP: [],
            FN: [],
          },
        },
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [0.9, 0.1, 0],
      ]);

      const scorer = answerCorrectness({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital.",
        expected: {
          referenceAnswer: "Paris is the capital of France.",
        },
      });

      const metadata =
        result.metadata as Evalite.Scorers.AnswerCorrectnessMetadata;

      expect(metadata).toBeDefined();
      expect(metadata.classification).toBeDefined();
      expect(metadata.classification.TP).toHaveLength(1);
      expect(metadata.classification.FP).toHaveLength(0);
      expect(metadata.classification.FN).toHaveLength(0);
      expect(metadata.factualityScore).toBe(1.0);
      expect(metadata.similarityScore).toBeGreaterThan(0.8);
      expect(metadata.responseStatements).toEqual(["Paris is the capital."]);
      expect(metadata.referenceStatements).toEqual([
        "Paris is the capital of France.",
      ]);
    });
  });

  describe("edge cases", () => {
    it("should handle empty statements from decomposition", async () => {
      const model = createMockModel([
        { statements: [] }, // Response decomposition returns empty
        { statements: [] }, // Reference decomposition returns empty
      ]);

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [1, 0, 0],
      ]);

      const scorer = answerCorrectness({ model, embeddingModel });

      const result = await scorer({
        input: "Test",
        output: "Unclear response",
        expected: { referenceAnswer: "Unclear reference" },
      });

      // Both statement lists empty should be treated as perfect match
      expect(result.score).toBe(1.0);
    });

    it("should handle zero similarity weight correctly", async () => {
      const model = createMockModel([
        { statements: ["Statement 1"] },
        { statements: ["Statement 1"] },
        {
          classification: {
            TP: [{ statement: "Statement 1", reason: "Match" }],
            FP: [],
            FN: [],
          },
        },
      ]);

      const embeddingModel = createMockEmbeddingModel([]);

      const scorer = answerCorrectness({
        model,
        embeddingModel,
        weights: [1.0, 0.0], // No similarity weight
      });

      const result = await scorer({
        input: "Test",
        output: "Statement 1",
        expected: { referenceAnswer: "Statement 1" },
      });

      // Only factuality matters, which is 1.0
      expect(result.score).toBe(1.0);
    });
  });
});

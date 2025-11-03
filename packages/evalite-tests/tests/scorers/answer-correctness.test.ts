import { describe, it, expect } from "vitest";
import { answerCorrectness } from "evalite/scorers";
import type { Evalite } from "evalite";
import { createMockModel, createMockEmbeddingModel } from "./utils.js";

describe("answerCorrectness scorer", () => {
  describe("perfect match", () => {
    it("should return 1.0 when answer perfectly matches reference", async () => {
      const model = createMockModel([
        { statements: ["Paris is the capital of France."] },

        { statements: ["Paris is the capital of France."] },

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

      const embeddingModel = createMockEmbeddingModel([
        [1, 0, 0],
        [1, 0, 0],
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
        [1, 0, 0],
        [0.95, 0.1, 0],
      ]);

      const scorer = answerCorrectness({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital of France.",
        expected: {
          referenceAnswer: "The capital of France is Paris.",
        },
      });

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
        [1, 0, 0],
        [0.8, 0.2, 0],
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
        [1, 0, 0],
        [0, 1, 0],
      ]);

      const scorer = answerCorrectness({ model, embeddingModel });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Berlin is the capital of France.",
        expected: {
          referenceAnswer: "Paris is the capital of France.",
        },
      });

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
        [1, 0.5, 0],
        [1, 0, 0],
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
        [1, 0, 0],
        [0.5, 0.5, 0],
      ]);

      const scorer = answerCorrectness({
        model,
        embeddingModel,
        weights: [0.9, 0.1],
      });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital of France.",
        expected: {
          referenceAnswer: "Paris is the capital of France.",
        },
      });

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
        [1, 0, 0],
        [0.95, 0.05, 0],
      ]);

      const scorer = answerCorrectness({
        model,
        embeddingModel,
        weights: [0.1, 0.9],
      });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital of France. Extra information.",
        expected: {
          referenceAnswer: "Paris is the capital of France.",
        },
      });

      expect(result.score).toBeGreaterThan(0.85);
    });
  });

  describe("F-beta parameter", () => {
    it("should favor recall when beta > 1", async () => {
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
        weights: [1.0, 0.0],
      });

      const resultHighBeta = await scorerHighBeta({
        input: "What is the capital of France?",
        output: "Paris is the capital of France.",
        expected: {
          referenceAnswer:
            "Paris is the capital of France. It is located in northern France.",
        },
      });

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

      const scorerLowBeta = answerCorrectness({
        model,
        embeddingModel,
        beta: 0.5,
        weights: [1.0, 0.0],
      });

      const resultLowBeta = await scorerLowBeta({
        input: "What is the capital of France?",
        output: "Paris is the capital of France. It has many museums.",
        expected: {
          referenceAnswer: "Paris is the capital of France.",
        },
      });

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
      const model = createMockModel([{ statements: [] }, { statements: [] }]);

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
        weights: [1.0, 0.0],
      });

      const result = await scorer({
        input: "Test",
        output: "Statement 1",
        expected: { referenceAnswer: "Statement 1" },
      });

      expect(result.score).toBe(1.0);
    });
  });
});

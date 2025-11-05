import { describe, it, expect } from "vitest";
import { noiseSensitivity } from "evalite/scorers";
import type { Evalite } from "evalite";
import { createMockModel } from "./utils.js";

describe("noiseSensitivity scorer", () => {
  describe("relevant mode", () => {
    it("should return 0 when all answers are correct", async () => {
      const model = createMockModel([
        { statements: ["Paris is the capital of France"] },
        { statements: ["Paris is the capital of France"] },
        { verdicts: [1] },
        { verdicts: [1] },
        { verdicts: [1] },
      ]);

      const scorer = noiseSensitivity({ model, mode: "relevant" });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "Paris is the capital of France",
        expected: {
          referenceAnswer: "Paris is the capital of France",
          groundTruth: ["France is a country in Europe. Paris is its capital."],
        },
      });

      expect(result.score).toBe(0);
    });

    it("should return 1 when all incorrect answers are faithful to relevant contexts", async () => {
      const model = createMockModel([
        { statements: ["Paris is the capital of France"] },
        { statements: ["London is the capital of France"] },
        { verdicts: [1] },
        { verdicts: [1] },
        { verdicts: [0] },
      ]);

      const scorer = noiseSensitivity({ model, mode: "relevant" });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "London is the capital of France",
        expected: {
          referenceAnswer: "Paris is the capital of France",
          groundTruth: [
            "Paris is the capital. London is also mentioned as a city.",
          ],
        },
      });

      expect(result.score).toBe(1);
    });

    it("should return 0.5 when half of incorrect answers are faithful to relevant contexts", async () => {
      const model = createMockModel([
        { statements: ["Paris is the capital of France"] },
        {
          statements: [
            "London is the capital of France",
            "Berlin is a city in Germany",
          ],
        },
        { verdicts: [1] },
        { verdicts: [1, 0] },
        { verdicts: [0, 1] },
      ]);

      const scorer = noiseSensitivity({ model, mode: "relevant" });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "London is the capital of France. Berlin is a city in Germany.",
        expected: {
          referenceAnswer: "Paris is the capital of France",
          groundTruth: ["Paris is the capital. London is mentioned."],
        },
      });

      expect(result.score).toBe(0.5);
    });
  });

  describe("irrelevant mode", () => {
    it("should return 1 when all incorrect answers are faithful to irrelevant contexts", async () => {
      const model = createMockModel([
        { statements: ["Paris is the capital of France"] },
        { statements: ["London is the capital of France"] },
        { verdicts: [0] },
        { verdicts: [0] },
        { verdicts: [0] },
        { verdicts: [1] },
        { verdicts: [0] },
      ]);

      const scorer = noiseSensitivity({ model, mode: "irrelevant" });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "London is the capital of France",
        expected: {
          referenceAnswer: "Paris is the capital of France",
          groundTruth: [
            "Germany is a country in Europe.",
            "London is a major city in England.",
          ],
        },
      });

      expect(result.score).toBe(1);
    });

    it("should return 0 when incorrect answers are faithful to relevant contexts only", async () => {
      const model = createMockModel([
        { statements: ["Paris is the capital of France"] },
        { statements: ["London is the capital of France"] },
        { verdicts: [1] },
        { verdicts: [0] },
        { verdicts: [1] },
        { verdicts: [0] },
        { verdicts: [0] },
      ]);

      const scorer = noiseSensitivity({ model, mode: "irrelevant" });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "London is the capital of France",
        expected: {
          referenceAnswer: "Paris is the capital of France",
          groundTruth: [
            "Paris is the capital. London is mentioned.",
            "Unrelated information about Germany.",
          ],
        },
      });

      expect(result.score).toBe(0);
    });
  });

  describe("validation", () => {
    it("should throw error if referenceAnswer is missing", async () => {
      const model = createMockModel([]);
      const scorer = noiseSensitivity({ model });

      await expect(
        scorer({
          input: "What is the capital?",
          output: "Paris",
          expected: {
            groundTruth: ["Some context"],
          } as any,
        })
      ).rejects.toThrow("referenceAnswer is required");
    });

    it("should throw error if groundTruth is missing", async () => {
      const model = createMockModel([]);
      const scorer = noiseSensitivity({ model });

      await expect(
        scorer({
          input: "What is the capital?",
          output: "Paris",
          expected: {
            referenceAnswer: "Paris is the capital",
          } as any,
        })
      ).rejects.toThrow("groundTruth (retrieved contexts) is required");
    });

    it("should throw error if groundTruth is empty", async () => {
      const model = createMockModel([]);
      const scorer = noiseSensitivity({ model });

      await expect(
        scorer({
          input: "What is the capital?",
          output: "Paris",
          expected: {
            referenceAnswer: "Paris is the capital",
            groundTruth: [],
          },
        })
      ).rejects.toThrow("groundTruth (retrieved contexts) is required");
    });

    it("should throw error for invalid mode", async () => {
      const model = createMockModel([]);
      const scorer = noiseSensitivity({ model, mode: "invalid" as any });

      await expect(
        scorer({
          input: "What is the capital?",
          output: "Paris",
          expected: {
            referenceAnswer: "Paris is the capital",
            groundTruth: ["Context"],
          },
        })
      ).rejects.toThrow("Invalid mode: invalid");
    });

    it("should throw error for multi-turn output", async () => {
      const model = createMockModel([]);
      const scorer = noiseSensitivity({ model });

      await expect(
        scorer({
          input: "What is the capital?",
          output: [{ role: "assistant", content: "Paris" }] as any,
          expected: {
            referenceAnswer: "Paris is the capital",
            groundTruth: ["Context"],
          },
        })
      ).rejects.toThrow(
        "Noise Sensitivity scorer does not support multi-turn output"
      );
    });
  });

  describe("metadata", () => {
    it("should return metadata with statement details", async () => {
      const model = createMockModel([
        { statements: ["Paris is the capital of France"] },
        { statements: ["London is the capital of France"] },
        { verdicts: [1] },
        { verdicts: [1] },
        { verdicts: [0] },
      ]);

      const scorer = noiseSensitivity({ model, mode: "relevant" });

      const result = await scorer({
        input: "What is the capital of France?",
        output: "London is the capital of France",
        expected: {
          referenceAnswer: "Paris is the capital of France",
          groundTruth: ["Paris and London are mentioned."],
        },
      });

      const metadata =
        result.metadata as Evalite.Scorers.NoiseSensitivityMetadata;

      expect(metadata).toBeDefined();
      expect(metadata.referenceStatements).toEqual([
        "Paris is the capital of France",
      ]);
      expect(metadata.answerStatements).toEqual([
        "London is the capital of France",
      ]);
      expect(metadata.incorrectStatements).toEqual([
        "London is the capital of France",
      ]);
      expect(metadata.mode).toBe("relevant");
      expect(metadata.relevantContextIndices).toEqual([0]);
      expect(metadata.irrelevantContextIndices).toEqual([]);
    });
  });
});

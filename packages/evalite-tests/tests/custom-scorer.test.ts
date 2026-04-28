import { expect, it } from "vitest";
import { loadFixture } from "./test-utils.js";
import { createScorer } from "evalite";
import { getSuitesAsRecordViaStorage } from "./test-utils.js";

it("Should let users create custom scorers", async () => {
  await using fixture = await loadFixture("custom-scorer");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals.Index![0]?.evals[0]?.scores[0]?.name).toBe("Is Same");
  expect(evals.Index![0]?.evals[0]?.scores[0]?.eval_id).toBe(1);
});

it("Should fail if the custom scorer does not return a number", async () => {
  const scorer = createScorer<string, string, never>({
    name: "Is Same",
    // @ts-expect-error
    scorer: async (input) => {
      return input === ("awdawd" as any);
    },
  });

  await expect(() =>
    // @ts-expect-error
    scorer({
      output: "awdawd",
    })
  ).rejects.toThrowError("The scorer 'Is Same' must return a number.");
});

it("Should fail if the custom scorer does not return an object containing score as a number", async () => {
  const scorer = createScorer<string, string, never>({
    name: "Is Same",
    // @ts-expect-error
    scorer: async (input) => {
      return {
        // @ts-expect-error
        score: input === "awdawd",
      };
    },
  });

  await expect(() =>
    scorer({
      expected: "awdawd" as never,
      input: "awdawd",
      output: "awdwd",
    })
  ).rejects.toThrowError("The scorer 'Is Same' must return a number.");
});

it("Should infer name and description from pre-built scorer return value", async () => {
  const scorer = createScorer<string, string, never>({
    scorer: async () => {
      return {
        name: "Tool Call Accuracy",
        description: "Checks if the tool calls are correct",
        score: 0.75,
        metadata: { someData: "test" },
      };
    },
  });

  const result = await scorer({
    expected: "" as never,
    input: "",
    output: "",
  });

  expect(result.name).toBe("Tool Call Accuracy");
  expect(result.description).toBe("Checks if the tool calls are correct");
  expect(result.score).toBe(0.75);
  expect(result.metadata).toEqual({ someData: "test" });
});

it("Should use explicit name/description over scorer return value when provided", async () => {
  const scorer = createScorer<string, string, never>({
    name: "Custom Name",
    description: "Custom Description",
    scorer: async () => {
      return {
        name: "Tool Call Accuracy",
        description: "Checks if the tool calls are correct",
        score: 0.75,
      };
    },
  });

  const result = await scorer({
    expected: "" as never,
    input: "",
    output: "",
  });

  expect(result.name).toBe("Custom Name");
  expect(result.description).toBe("Custom Description");
  expect(result.score).toBe(0.75);
});

it("Should use 'Unnamed Scorer' when no name provided and scorer returns number", async () => {
  const scorer = createScorer<string, string, never>({
    scorer: async () => {
      return 0.5;
    },
  });

  const result = await scorer({
    expected: "" as never,
    input: "",
    output: "",
  });

  expect(result.name).toBe("Unnamed Scorer");
  expect(result.score).toBe(0.5);
});

it("Should use 'Unnamed Scorer' when no name provided and scorer returns object without name", async () => {
  const scorer = createScorer<string, string, never>({
    scorer: async () => {
      return {
        score: 0.5,
        metadata: { someData: "test" },
      };
    },
  });

  const result = await scorer({
    expected: "" as never,
    input: "",
    output: "",
  });

  expect(result.name).toBe("Unnamed Scorer");
  expect(result.score).toBe(0.5);
});

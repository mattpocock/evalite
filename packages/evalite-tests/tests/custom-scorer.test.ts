import { expect, it } from "vitest";
import { loadFixture } from "./test-utils.js";
import { createScorer } from "evalite";
import { getEvalsAsRecordViaStorage } from "./test-utils.js";

it("Should let users create custom scorers", async () => {
  await using fixture = await loadFixture("custom-scorer");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  expect(evals.Index![0]?.results[0]?.scores[0]?.name).toBe("Is Same");
  expect(evals.Index![0]?.results[0]?.scores[0]?.score).toBe(1);
});

it("Should fail if the custom scorer does not return a number", async () => {
  const scorer = createScorer<string, string, never>({
    name: "Is Same",
    // @ts-expect-error We intentionally return a boolean instead of a number to test error handling when the custom scorer returns a non-number type.
    scorer: async (input) => {
      return input === ("awdawd" as any);
    },
  });

  await expect(() =>
    // @ts-expect-error We intentionally omit the required 'input' property to test error handling when the scorer is called with missing input.
    scorer({
      output: "awdawd",
    })
  ).rejects.toThrowError("The scorer 'Is Same' must return a number.");
});

it("Should fail if the custom scorer does not return an object containing score as a number", async () => {
  const scorer = createScorer<string, string, never>({
    name: "Is Same",
    // @ts-expect-error Intentionally pass a boolean instead of a number for score to test error handling for non-number return types.
    scorer: async (input) => {
      return {
        // @ts-expect-error We intentionally return a boolean for "score" instead of a number to test error handling for non-number score fields.
        score: input === "awdawd",
      };
    },
  });

  await expect(() =>
    scorer({
      input: "awdawd",
      output: "awdwd" as any,
    })
  ).rejects.toThrowError("The scorer 'Is Same' must return a number.");
});

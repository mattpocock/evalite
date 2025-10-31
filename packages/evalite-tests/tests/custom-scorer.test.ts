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
    // @ts-expect-error We intentionally return a boolean instead of a number to test error handling when the custom scorer returns a non-number type.
    scorer: async (input) => {
      return {
        // @ts-expect-error We intentionally return a boolean instead of a number to test error handling when the custom scorer returns a non-number type.
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

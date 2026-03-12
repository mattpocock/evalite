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

it("Should let users return an array of scores from custom scorers", async () => {
  await using fixture = await loadFixture("custom-scorer-array");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);
  const scores = evals.Index![0]?.results[0]?.scores;

  expect(scores).toHaveLength(4);
  expect(scores![0]?.name).toBe("Multiple Criteria");
  expect(scores![0]?.score).toBe(1);
  expect((scores![0]?.metadata as any)?.criterion).toBe("Is Same");

  expect(scores![1]?.name).toBe("Multiple Criteria");
  expect(scores![1]?.score).toBe(1);
  expect((scores![1]?.metadata as any)?.criterion).toBe("Length is 6");

  expect(scores![2]?.name).toBe("Inline Scorer 1");
  expect(scores![2]?.score).toBe(1);

  expect(scores![3]?.name).toBe("Inline Scorer 2");
  expect(scores![3]?.score).toBe(0.5);
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
      input: "awdawd",
      output: "awdwd" as any,
    })
  ).rejects.toThrowError("The scorer 'Is Same' must return a number.");
});

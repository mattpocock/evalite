import { expect, it } from "vitest";
import { getEvalsAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should create N results per data point when trialCount is set", async () => {
  await using fixture = await loadFixture("trial-count");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);
  const results = evals["Trial Count Test"]?.[0]?.results;

  // 2 data points × 3 trials = 6 results
  expect(results).toHaveLength(6);
});

it("Should assign unique col_order to each trial", async () => {
  await using fixture = await loadFixture("trial-count");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);
  const results = evals["Trial Count Test"]?.[0]?.results || [];

  // All col_order values should be unique
  const colOrders = results.map((r) => r.col_order);
  const uniqueColOrders = new Set(colOrders);
  expect(uniqueColOrders.size).toBe(colOrders.length);

  // Should be sequential: 0, 1, 2, 3, 4, 5
  expect(colOrders.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
});

it("Should store trial_index correctly", async () => {
  await using fixture = await loadFixture("trial-count");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);
  const results = evals["Trial Count Test"]?.[0]?.results || [];

  // Group results by input
  const resultsByInput: Record<string, typeof results> = {};
  for (const result of results) {
    const input = result.input as string;
    if (!resultsByInput[input]) {
      resultsByInput[input] = [];
    }
    resultsByInput[input]!.push(result);
  }

  // Each input should have 3 trials with trial_index 0, 1, 2
  expect(resultsByInput["a"]).toHaveLength(3);
  expect(resultsByInput["b"]).toHaveLength(3);

  const trialIndicesA = resultsByInput["a"]!.map((r) => r.trial_index).sort();
  const trialIndicesB = resultsByInput["b"]!.map((r) => r.trial_index).sort();

  expect(trialIndicesA).toEqual([0, 1, 2]);
  expect(trialIndicesB).toEqual([0, 1, 2]);
});

it("Should respect trialCount from config", async () => {
  await using fixture = await loadFixture("trial-count-config");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);
  const results = evals["Config Trial Count"]?.[0]?.results;

  // 1 data point × 5 trials (from config) = 5 results
  expect(results).toHaveLength(5);

  const trialIndices = results!.map((r) => r.trial_index).sort();
  expect(trialIndices).toEqual([0, 1, 2, 3, 4]);
});

it("Should let eval-level trialCount override config-level", async () => {
  await using fixture = await loadFixture("trial-count-precedence");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);
  const results = evals["Precedence Test"]?.[0]?.results;

  // 1 data point × 4 trials (from eval opts, overriding config's 2) = 4 results
  expect(results).toHaveLength(4);

  const trialIndices = results!.map((r) => r.trial_index).sort();
  expect(trialIndices).toEqual([0, 1, 2, 3]);
});

it("Should work with skip modifier", async () => {
  await using fixture = await loadFixture("trial-count");

  // Create a fixture with a skipped eval
  const fs = await import("fs/promises");
  const path = await import("path");

  await fs.writeFile(
    path.join(fixture.dir, "skipped.eval.ts"),
    `
import { evalite } from "evalite";

evalite.skip("Skipped Trial Test", {
  data: () => [{ input: "a", expected: "a" }],
  task: async (input) => input,
  scorers: [],
  trialCount: 3,
});
`
  );

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  // Skipped eval should not create any results
  expect(evals["Skipped Trial Test"]).toBeUndefined();
});

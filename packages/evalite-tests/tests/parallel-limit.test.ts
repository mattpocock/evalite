import { expect, it } from "vitest";
import { getEvalsAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should enforce parallelLimit for variants", async () => {
  await using fixture = await loadFixture("parallel-limit");

  await fixture.run({ mode: "run-once-and-exit" });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  // All 4 variants should complete successfully
  expect(evals["Parallel Limit Test [Variant 1]"]).toBeDefined();
  expect(evals["Parallel Limit Test [Variant 2]"]).toBeDefined();
  expect(evals["Parallel Limit Test [Variant 3]"]).toBeDefined();
  expect(evals["Parallel Limit Test [Variant 4]"]).toBeDefined();

  // Verify outputs are correct
  expect(
    evals["Parallel Limit Test [Variant 1]"]?.[0]?.results[0]?.output
  ).toBe("test-output-1");
  expect(
    evals["Parallel Limit Test [Variant 2]"]?.[0]?.results[0]?.output
  ).toBe("test-output-2");
  expect(
    evals["Parallel Limit Test [Variant 3]"]?.[0]?.results[0]?.output
  ).toBe("test-output-3");
  expect(
    evals["Parallel Limit Test [Variant 4]"]?.[0]?.results[0]?.output
  ).toBe("test-output-4");
});

it("Should run sequentially with parallelLimit: 1", async () => {
  await using fixture = await loadFixture("parallel-limit-sequential");

  await fixture.run({ mode: "run-once-and-exit" });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  // All 3 variants should complete successfully
  expect(evals["Sequential Test [V1]"]).toBeDefined();
  expect(evals["Sequential Test [V2]"]).toBeDefined();
  expect(evals["Sequential Test [V3]"]).toBeDefined();

  // Verify outputs
  expect(evals["Sequential Test [V1]"]?.[0]?.results[0]?.output).toBe(
    "test-result-1"
  );
  expect(evals["Sequential Test [V2]"]?.[0]?.results[0]?.output).toBe(
    "test-result-2"
  );
  expect(evals["Sequential Test [V3]"]?.[0]?.results[0]?.output).toBe(
    "test-result-3"
  );
});

it("Should run all variants concurrently when no parallelLimit is specified", async () => {
  await using fixture = await loadFixture("parallel-limit-none");

  await fixture.run({ mode: "run-once-and-exit" });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  // All 3 variants should complete successfully
  expect(evals["No Limit Test [A]"]).toBeDefined();
  expect(evals["No Limit Test [B]"]).toBeDefined();
  expect(evals["No Limit Test [C]"]).toBeDefined();

  // Verify outputs
  expect(evals["No Limit Test [A]"]?.[0]?.results[0]?.output).toBe(
    "test-value-1"
  );
  expect(evals["No Limit Test [B]"]?.[0]?.results[0]?.output).toBe(
    "test-value-2"
  );
  expect(evals["No Limit Test [C]"]?.[0]?.results[0]?.output).toBe(
    "test-value-3"
  );
});

import { expect, it } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should run only the marked entry when only: true is present", async () => {
  await using fixture = await loadFixture("only-flag-single");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const suites = await getSuitesAsRecordViaStorage(fixture.storage);

  // Should only have 1 result (the one with only: true)
  expect(suites["Only Flag Single"]?.[0]?.evals).toHaveLength(1);

  // Verify it's the correct entry (input "c")
  expect(suites["Only Flag Single"]?.[0]?.evals[0]?.input).toBe("c");
});

it("Should run all entries when no only: true is present", async () => {
  await using fixture = await loadFixture("only-flag-none");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const suites = await getSuitesAsRecordViaStorage(fixture.storage);

  // Should have all 3 results
  expect(suites["Only Flag None"]?.[0]?.evals).toHaveLength(3);

  // Verify all inputs are present
  const inputs = suites["Only Flag None"]?.[0]?.evals.map((r) => r.input);
  expect(inputs).toEqual(expect.arrayContaining(["a", "b", "c"]));
});

it("Should run multiple entries when multiple only: true are present", async () => {
  await using fixture = await loadFixture("only-flag-multiple");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  // Should only have 2 results (the ones with only: true)
  expect(evals["Only Flag Multiple"]?.[0]?.evals).toHaveLength(2);

  // Verify it's the correct entries (input "b" and "d")
  const inputs = evals["Only Flag Multiple"]?.[0]?.evals.map((r) => r.input);
  expect(inputs).toEqual(expect.arrayContaining(["b", "d"]));
});

it("Should verify stdout shows correct test count for only flag", async () => {
  await using fixture = await loadFixture("only-flag-single");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const output = fixture.getOutput();

  // Should show 1 eval ran (not 3)
  expect(output).toContain("Evals  1");
});

it("Should work with variants when only: true is present", async () => {
  await using fixture = await loadFixture("only-flag-variants");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  // Should have 2 evals (one per variant), each with 1 result
  const variantAEval = evals["Only Flag Variants [variant-a]"];
  const variantBEval = evals["Only Flag Variants [variant-b]"];

  expect(variantAEval?.[0]?.evals).toHaveLength(1);
  expect(variantBEval?.[0]?.evals).toHaveLength(1);

  // Verify the correct entry ran for each variant
  expect(variantAEval?.[0]?.evals[0]?.input).toBe("test2");
  expect(variantBEval?.[0]?.evals[0]?.input).toBe("test2");
});

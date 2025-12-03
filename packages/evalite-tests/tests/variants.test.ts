import { expect, it } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should create separate evals for each variant", async () => {
  await using fixture = await loadFixture("variants");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  // Should have 3 separate evals, one for each variant
  expect(evals["Compare models [Variant A]"]).toBeDefined();
  expect(evals["Compare models [Variant B]"]).toBeDefined();
  expect(evals["Compare models [Variant C]"]).toBeDefined();
});

it("Should store variant metadata in database", async () => {
  await using fixture = await loadFixture("variants");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals["Compare models [Variant A]"]?.[0]).toMatchObject({
    variant_name: "Variant A",
    variant_group: "Compare models",
  });

  expect(evals["Compare models [Variant B]"]?.[0]).toMatchObject({
    variant_name: "Variant B",
    variant_group: "Compare models",
  });

  expect(evals["Compare models [Variant C]"]?.[0]).toMatchObject({
    variant_name: "Variant C",
    variant_group: "Compare models",
  });
});

it("Should pass correct variant value to task function", async () => {
  await using fixture = await loadFixture("variants");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  // Each variant should have results with different outputs based on variant value
  expect(evals["Compare models [Variant A]"]?.[0]?.evals[0]?.output).toBe(
    "output-a"
  );
  expect(evals["Compare models [Variant B]"]?.[0]?.evals[0]?.output).toBe(
    "output-b"
  );
  expect(evals["Compare models [Variant C]"]?.[0]?.evals[0]?.output).toBe(
    "output-c"
  );
});

it("Should display variant column in CLI output", async () => {
  await using fixture = await loadFixture("only-flag-variants");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const output = fixture.getOutput();

  // Should contain Variant column header
  expect(output).toContain("Variant");

  // Should contain variant names in sorted order
  expect(output).toContain("variant-a");
  expect(output).toContain("variant-b");

  // Verify variant-a appears before variant-b (sorted alphabetically)
  const variantAIndex = output.indexOf("variant-a");
  const variantBIndex = output.indexOf("variant-b");
  expect(variantAIndex).toBeLessThan(variantBIndex);
});

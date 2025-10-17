import { expect, it } from "vitest";
import { getEvalsAsRecordViaAdapter, loadFixture } from "./test-utils.js";

it("Should create separate evals for each variant", async () => {
  await using fixture = await loadFixture("variants");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.adapter);

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

  const evals = await getEvalsAsRecordViaAdapter(fixture.adapter);

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

  const evals = await getEvalsAsRecordViaAdapter(fixture.adapter);

  // Each variant should have results with different outputs based on variant value
  expect(evals["Compare models [Variant A]"]?.[0]?.results[0]?.output).toBe(
    "output-a"
  );
  expect(evals["Compare models [Variant B]"]?.[0]?.results[0]?.output).toBe(
    "output-b"
  );
  expect(evals["Compare models [Variant C]"]?.[0]?.results[0]?.output).toBe(
    "output-c"
  );
});

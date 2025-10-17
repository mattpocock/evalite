import { expect, it } from "vitest";
import { getEvalsAsRecordViaAdapter, loadFixture } from "./test-utils.js";

it("Should allow non-serializable data (like validators/schemas) in expected field", async () => {
  await using fixture = await loadFixture("non-serializable-data");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const output = fixture.getOutput();

  // Should not have serialization errors
  expect(output).not.toContain("could not be cloned");

  // Should complete successfully
  expect(output).toContain("non-serializable-data.eval.ts");

  const evals = await getEvalsAsRecordViaAdapter(fixture.adapter);

  // Should successfully run without serialization errors
  expect(evals["Non-serializable data"]).toBeDefined();
  expect(evals["Non-serializable data"]?.[0]?.status).toBe("success");
  expect(evals["Non-serializable data"]?.[0]?.results[0]?.status).toBe(
    "success"
  );

  // Should have a score of 1 (validator passed)
  expect(
    evals["Non-serializable data"]?.[0]?.results[0]?.scores[0]?.score
  ).toBe(1);
  expect(evals["Non-serializable data"]?.[0]?.results[0]?.scores[0]?.name).toBe(
    "Validator check"
  );
});

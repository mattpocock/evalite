import { expect, it } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";

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

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  // Should successfully run without serialization errors
  expect(evals["Non-serializable data"]).toBeDefined();
  expect(evals["Non-serializable data"]?.[0]?.status).toBe("success");
  expect(evals["Non-serializable data"]?.[0]?.evals[0]?.status).toBe("success");

  // Should have a score of 1 (validator passed)
  expect(
    evals["Non-serializable data"]?.[0]?.evals[0]?.scores[0]?.eval_id
  ).toBe(1);
  expect(evals["Non-serializable data"]?.[0]?.evals[0]?.scores[0]?.name).toBe(
    "Validator check"
  );
});

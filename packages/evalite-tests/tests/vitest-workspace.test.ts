import { expect, it } from "vitest";
import { getEvalsAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should run evalite successfully despite vitest workspace config", async () => {
  await using fixture = await loadFixture("vitest-workspace");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const output = fixture.getOutput();

  // Should not have "No suite present" or "No result present" errors
  expect(output).not.toContain("No suite present");
  expect(output).not.toContain("No result present");

  // Should not have run the unit test
  // TODO: This currently fails - workspace config causes evalite to pick up .test.ts files
  expect(output).not.toContain("UNIT_TEST_RAN");

  // Should have run the eval successfully
  // TODO: This currently fails - workspace config prevents .eval.ts files from being found
  const evals = await getEvalsAsRecordViaStorage(fixture.storage);
  expect(evals.Basics).toHaveLength(1);
  expect(evals.Basics?.[0]?.status).toBe("success");
});

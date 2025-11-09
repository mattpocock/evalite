import { expect, it } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";

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
  expect(output).not.toContain("UNIT_TEST_RAN");

  // Should have run the eval successfully
  const suites = await getSuitesAsRecordViaStorage(fixture.storage);
  expect(suites.Basics).toHaveLength(1);
  expect(suites.Basics?.[0]?.evals).toHaveLength(1);
  expect(suites.Basics?.[0]?.evals?.[0]?.status).toBe("success");
});

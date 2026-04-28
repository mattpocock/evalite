import { expect, it, vitest } from "vitest";
import {
  getSuitesAsRecordViaStorage,
  loadFixture,
  overrideExit,
} from "./test-utils.js";

it("Should set exitCode to 1 if there is a timeout", async () => {
  await using fixture = await loadFixture("timeout");

  const exit = vitest.fn();
  using _ = overrideExit(exit);

  await fixture.run({
    mode: "run-once-and-exit",
  });

  expect(fixture.getOutput()).toContain("timeout");
  expect(exit).toHaveBeenCalledWith(1);
});

it("Should handle timeouts gracefully", async () => {
  await using fixture = await loadFixture("timeout");

  const exit = vitest.fn();
  using _ = overrideExit(exit);

  await fixture.run({
    mode: "run-once-and-exit",
  });

  // Should indicate a failure in the output
  expect(fixture.getOutput()).toContain("Score  ✖ (1 failed)");
  expect(fixture.getOutput()).toContain("Eval Files  1");
  expect(fixture.getOutput()).toContain("Evals  1");

  expect(fixture.getOutput()).not.toContain("No result present");
});

it("Should record timeout information in the database", async () => {
  await using fixture = await loadFixture("timeout");

  const exit = vitest.fn();
  using _ = overrideExit(exit);

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals.Timeout?.[0]).toMatchObject({
    name: "Timeout",
    evals: [
      {
        status: "fail",
      },
    ],
  });
});

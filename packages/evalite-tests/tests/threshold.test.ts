import { expect, it, vitest } from "vitest";
import { loadFixture, overrideExit } from "./test-utils.js";

it("Should set exitCode to 1 if the score is below the threshold", async () => {
  await using fixture = await loadFixture("threshold");

  const exit = vitest.fn();
  using _ = overrideExit(exit);

  await fixture.run({
    mode: "run-once-and-exit",
    scoreThreshold: 50,
  });

  expect(fixture.getOutput()).toContain("Threshold  50% (failed)");
  expect(exit).toHaveBeenCalledWith(1);
});

it("Should pass if the score is at the threshold", async () => {
  await using fixture = await loadFixture("threshold");

  const exit = vitest.fn();
  using _ = overrideExit(exit);

  await fixture.run({
    mode: "run-once-and-exit",
    scoreThreshold: 20,
  });

  expect(fixture.getOutput()).toContain("Threshold  20% (passed)");
});

it("Should pass if the score exceeds the threshold", async () => {
  await using fixture = await loadFixture("threshold");

  const exit = vitest.fn();
  using _ = overrideExit(exit);

  await fixture.run({
    mode: "run-once-and-exit",
    scoreThreshold: 10,
  });

  expect(fixture.getOutput()).toContain("Threshold  10% (passed)");
});

import { expect, it } from "vitest";
import { loadFixture } from "./test-utils.js";

it("Should report multiple evals correctly", async () => {
  await using fixture = await loadFixture("multi");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  expect(fixture.getOutput()).toContain("Duration");
  expect(fixture.getOutput()).toContain("Score  100%");
  expect(fixture.getOutput()).toContain("Eval Files  3");
  expect(fixture.getOutput()).toContain("Evals  4");
  expect(fixture.getOutput()).toContain("100% multi-1.eval.ts  (1 eval)");
  expect(fixture.getOutput()).toContain("100% multi-2.eval.ts  (1 eval)");
  expect(fixture.getOutput()).toContain("100% multi-3.eval.ts  (2 evals)");
});

it("Should not show a table when running multiple evals", async () => {
  await using fixture = await loadFixture("multi");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  expect(fixture.getOutput()).not.toContain("ONLY ONE EVAL");
});

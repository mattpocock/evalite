import { expect, it } from "vitest";
import { loadFixture } from "./test-utils.js";

it("Should report long text correctly", async () => {
  await using fixture = await loadFixture("long-text");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  expect(fixture.getOutput()).toContain("Input");
  expect(fixture.getOutput()).toContain("Output");
  expect(fixture.getOutput()).toContain("Score");
  expect(fixture.getOutput()).toContain("Some extremely long text");
});

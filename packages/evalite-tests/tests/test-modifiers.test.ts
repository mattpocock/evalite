import { loadFixture } from "./test-utils.js";
import { expect, it } from "vitest";

it("should call opts.data() 3 times when running 3 regular tests", async () => {
  // Load the regular fixture where 3 evalite tests log when opts.data is called.
  await using fixture = await loadFixture("test-modifiers-regular");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const output = fixture.getOutput();
  const count1 = (
    output.match(/opts\.data\(\) called in Regular Test 1/g) || []
  ).length;
  const count2 = (
    output.match(/opts\.data\(\) called in Regular Test 2/g) || []
  ).length;
  const count3 = (
    output.match(/opts\.data\(\) called in Regular Test 3/g) || []
  ).length;
  expect(count1).toBe(1);
  expect(count2).toBe(1);
  expect(count3).toBe(1);
});

it("should not call opts.data() for a skipped test", async () => {
  // Load the fixture where one test is skipped.
  await using fixture = await loadFixture("test-modifiers-skipped");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const output = fixture.getOutput();
  // The regular test should log, but the skipped test should not.
  expect(output).toContain("opts.data() called in Regular Test");
  expect(output).not.toContain("opts.data() called in Skipped Test");
});

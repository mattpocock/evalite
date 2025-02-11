import { assert, expect, it, vitest } from "vitest";
import { runVitest } from "evalite/runner";
import { captureStdout, loadFixture } from "./test-utils.js";
import { createDatabase, getEvals, getEvalsAsRecord } from "@evalite/core/db";

it("Should set exitCode to 1 if the score is below the threshold", async () => {
  using fixture = loadFixture("threshold");

  const captured = captureStdout();

  const exit = vitest.fn();

  globalThis.process.exit = exit as any;

  await runVitest({
    cwd: fixture.dir,
    mode: "run-once-and-exit",
    path: undefined,
    scoreThreshold: 50,
    testOutputWritable: captured.writable,
  });

  expect(captured.getOutput()).toContain("Threshold  50% (failed)");
  expect(exit).toHaveBeenCalledWith(1);
});

it("Should pass if the score is at the threshold", async () => {
  using fixture = loadFixture("threshold");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    mode: "run-once-and-exit",
    path: undefined,
    scoreThreshold: 20,
    testOutputWritable: captured.writable,
  });

  expect(captured.getOutput()).toContain("Threshold  20% (passed)");
});

it("Should pass if the score exceeds the threshold", async () => {
  using fixture = loadFixture("threshold");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    mode: "run-once-and-exit",
    path: undefined,
    scoreThreshold: 10,
    testOutputWritable: captured.writable,
  });

  expect(captured.getOutput()).toContain("Threshold  10% (passed)");
});

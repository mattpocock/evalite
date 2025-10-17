import { runVitest } from "evalite/runner";
import { expect, it } from "vitest";
import { captureStdout, loadFixture } from "./test-utils.js";

it("Should report multiple evals correctly", async () => {
  using fixture = loadFixture("multi");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  expect(captured.getOutput()).toContain("Duration");
  expect(captured.getOutput()).toContain("Score  100%");
  expect(captured.getOutput()).toContain("Eval Files  3");
  expect(captured.getOutput()).toContain("Evals  4");
  expect(captured.getOutput()).toContain("100% multi-1.eval.ts  (1 eval)");
  expect(captured.getOutput()).toContain("100% multi-2.eval.ts  (1 eval)");
  expect(captured.getOutput()).toContain("100% multi-3.eval.ts  (2 evals)");
});

it("Should not show a table when running multiple evals", async () => {
  using fixture = loadFixture("multi");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  expect(captured.getOutput()).not.toContain("ONLY ONE EVAL");
});

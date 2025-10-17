import { getEvalsAsRecordViaAdapter } from "./test-utils.js";
import { runVitest } from "evalite/runner";
import { expect, it, vitest } from "vitest";
import { captureStdout, loadFixture } from "./test-utils.js";

it("Should set exitCode to 1 if there is a failing test", async () => {
  using fixture = loadFixture("failing-test");

  const captured = captureStdout();
  const exit = vitest.fn();
  globalThis.process.exit = exit as any;

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  expect(captured.getOutput()).toContain("failed");
  expect(exit).toHaveBeenCalledWith(1);
});

it("Should report a failing test", async () => {
  using fixture = loadFixture("failing-test");

  const captured = captureStdout();
  const exit = vitest.fn();
  globalThis.process.exit = exit as any;

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  expect(captured.getOutput()).toContain("failing-test.eval.ts");
  expect(captured.getOutput()).toContain("Score  ✖ (1 failed)");

  // Should not display a table
  expect(captured.getOutput()).not.toContain("Input");
});

it("Should save the result AND eval as failed in the database", async () => {
  using fixture = loadFixture("failing-test");

  const captured = captureStdout();
  const exit = vitest.fn();
  globalThis.process.exit = exit as any;

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.dbLocation);

  expect(evals.Failing?.[0]).toMatchObject({
    name: "Failing",
    status: "fail" satisfies Db.EvalStatus,
    results: [
      {
        status: "fail",
      },
    ],
  });
});

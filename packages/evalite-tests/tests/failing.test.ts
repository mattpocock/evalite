import { getEvalsAsRecordViaAdapter } from "./test-utils.js";
import { createSqliteAdapter } from "evalite/sqlite-adapter";
import { runEvalite } from "evalite/runner";
import { expect, it, vitest } from "vitest";
import { captureStdout, loadFixture } from "./test-utils.js";
import type { Evalite } from "evalite";

it("Should set exitCode to 1 if there is a failing test", async () => {
  using fixture = loadFixture("failing-test");

  const captured = captureStdout();
  const exit = vitest.fn();
  globalThis.process.exit = exit as any;

  await runEvalite({
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

  await runEvalite({
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

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  await using adapter = await createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  expect(evals.Failing?.[0]).toMatchObject({
    name: "Failing",
    status: "fail" satisfies Evalite.Adapter.Entities.EvalStatus,
    results: [
      {
        status: "fail",
      },
    ],
  });
});

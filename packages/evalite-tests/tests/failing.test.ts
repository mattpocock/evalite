import type { Evalite } from "evalite";
import { expect, it, vitest } from "vitest";
import {
  getSuitesAsRecordViaStorage,
  loadFixture,
  overrideExit,
} from "./test-utils.js";

it("Should set exitCode to 1 if there is a failing test", async () => {
  await using fixture = await loadFixture("failing-test");

  const exit = vitest.fn();
  using _ = overrideExit(exit);

  await fixture.run({
    mode: "run-once-and-exit",
  });

  expect(fixture.getOutput()).toContain("failed");
  expect(exit).toHaveBeenCalledWith(1);
});

it("Should report a failing test", async () => {
  await using fixture = await loadFixture("failing-test");

  const exit = vitest.fn();
  using _ = overrideExit(exit);

  await fixture.run({
    mode: "run-once-and-exit",
  });

  expect(fixture.getOutput()).toContain("failing-test.eval.ts");
  expect(fixture.getOutput()).toContain("Score  ✖ (1 failed)");

  // Should not display a table
  expect(fixture.getOutput()).not.toContain("Input");
});

it("Should report a failing test in data()", async () => {
  await using fixture = await loadFixture("failing-test-in-data");

  const exit = vitest.fn();
  using _ = overrideExit(exit);

  await fixture.run({
    mode: "run-once-and-exit",
  });

  expect(fixture.getOutput()).toContain("failing-test.eval.ts");
  expect(fixture.getOutput()).toContain("Score  ✖ (1 failed)");

  // Should not display a table
  expect(fixture.getOutput()).not.toContain("Input");
});

it("Should report a failing test in data() in watch mode", async () => {
  await using fixture = await loadFixture("failing-test-in-data");

  const exit = vitest.fn();
  using _ = overrideExit(exit);

  await fixture.run({
    mode: "watch-for-file-changes",
  });

  expect(fixture.getOutput()).toContain("failing-test.eval.ts");
  expect(fixture.getOutput()).toContain("Score  ✖ (1 failed)");

  // Should not display a table
  expect(fixture.getOutput()).not.toContain("Input");

  await fixture.waitForTestRunEnd();
});

it("Should save the result AND eval as failed in the database", async () => {
  await using fixture = await loadFixture("failing-test");

  const exit = vitest.fn();
  using _ = overrideExit(exit);

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals.Failing?.[0]).toMatchObject({
    name: "Failing",
    status: "fail" satisfies Evalite.Storage.Entities.SuiteStatus,
    evals: [
      {
        status: "fail",
      },
    ],
  });
});

it("Should handle module-level errors", async () => {
  await using fixture = await loadFixture("module-level-error");

  const exit = vitest.fn();
  globalThis.process.exit = exit as any;

  await fixture.run({
    mode: "run-once-and-exit",
  });

  console.log(fixture.getOutput());

  expect(fixture.getOutput()).toContain("module-level-error.eval.ts");
  expect(fixture.getOutput()).toContain("Module level error");
  expect(exit).toHaveBeenCalledWith(1);
});

it("Should fail overall when one eval file throws but another passes (issue 357)", async () => {
  await using fixture = await loadFixture("issue-357");

  const exit = vitest.fn();
  using _ = overrideExit(exit);

  await fixture.run({
    mode: "run-once-and-exit",
    scoreThreshold: 70,
  });

  const output = fixture.getOutput();

  console.log(output);

  // Verify both files are mentioned
  expect(output).toContain("failing.eval.ts");
  expect(output).toContain("passing.eval.ts");

  // Verify error is shown
  expect(output).toContain("Module level error");

  // Verify threshold info is shown
  expect(output).toContain("Threshold");

  // THIS IS THE BUG: exit code should be 1, but may currently be 0
  expect(exit).toHaveBeenCalledWith(1);
});

it("Should NOT crash when table content exceeds terminal width (issue 358)", async () => {
  await using fixture = await loadFixture("issue-358");

  const exit = vitest.fn();
  using _ = overrideExit(exit);

  // Set narrow terminal width to trigger the bug
  const originalColumns = process.stdout.columns;
  Object.defineProperty(process.stdout, "columns", {
    value: 80,
    writable: true,
    configurable: true,
  });

  try {
    // BUG: Currently throws "Subject parameter value width cannot be greater than the container width"
    // Once fixed, this should complete successfully without throwing
    await fixture.run({
      mode: "run-once-and-exit",
    });

    const output = fixture.getOutput();

    // Verify tests passed (100% score)
    expect(output).toContain("100%");
    expect(output).toContain("issue-358.eval.ts");

    // Should display the table without crashing
    expect(output).toMatch(/Email From|Email Subject|Classification/);

    // Should exit cleanly
    expect(exit).not.toHaveBeenCalled();
  } finally {
    // Restore original columns value
    Object.defineProperty(process.stdout, "columns", {
      value: originalColumns,
      writable: true,
      configurable: true,
    });
  }
});

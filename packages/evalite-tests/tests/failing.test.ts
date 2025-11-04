import type { Evalite } from "evalite";
import { expect, it, vitest } from "vitest";
import { getEvalsAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should set exitCode to 1 if there is a failing test", async () => {
  await using fixture = await loadFixture("failing-test");

  const exit = vitest.fn();
  globalThis.process.exit = exit as any;

  await fixture.run({
    mode: "run-once-and-exit",
  });

  expect(fixture.getOutput()).toContain("failed");
  expect(exit).toHaveBeenCalledWith(1);
});

it("Should report a failing test", async () => {
  await using fixture = await loadFixture("failing-test");

  const exit = vitest.fn();
  globalThis.process.exit = exit as any;

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
  globalThis.process.exit = exit as any;

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
  globalThis.process.exit = exit as any;

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

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  expect(evals.Failing?.[0]).toMatchObject({
    name: "Failing",
    status: "fail" satisfies Evalite.Storage.Entities.EvalStatus,
    results: [
      {
        status: "fail",
      },
    ],
  });
});

it.only("Should handle module-level errors", async () => {
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

it.only("Should save module-level error eval as failed in database", async () => {
  await using fixture = await loadFixture("module-level-error");

  const exit = vitest.fn();
  globalThis.process.exit = exit as any;

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  expect(evals.Failing?.[0]).toMatchObject({
    name: "Failing",
    status: "fail" satisfies Evalite.Storage.Entities.EvalStatus,
  });
});

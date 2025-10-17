import type { Evalite } from "evalite";
import { expect, it, vitest } from "vitest";
import { getEvalsAsRecordViaAdapter, loadFixture } from "./test-utils.js";

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

it("Should save the result AND eval as failed in the database", async () => {
  await using fixture = await loadFixture("failing-test");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.adapter);

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

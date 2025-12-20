import { expect, it } from "vitest";
import { getEvalsAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should allow you to pass a specific filename to run", async () => {
  await using fixture = await loadFixture("paths");

  await fixture.run({
    mode: "run-once-and-exit",
    path: "should-run.eval.ts",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  expect(evals["Should Run"]).toHaveLength(1);
  expect(evals["Should Not Run"]).not.toBeDefined();
});

it("Should allow you to pass a filename filter", async () => {
  await using fixture = await loadFixture("paths");

  await fixture.run({
    mode: "run-once-and-exit",
    path: "should-run",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  expect(evals["Should Run"]).toHaveLength(1);
  expect(evals["Should Not Run"]).not.toBeDefined();
});

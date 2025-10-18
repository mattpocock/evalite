import { expect, it, vi } from "vitest";
import { getEvalsAsRecordViaAdapter, loadFixture } from "./test-utils.js";

it("Should ignore includes in a vite.config.ts", async () => {
  await using fixture = await loadFixture("config-includes");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.adapter);

  expect(evals.Basics).toHaveLength(1);
});

it("Should load evalite.config.ts and use custom adapter", async () => {
  await using fixture = await loadFixture("evalite-config");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.adapter);

  // Verify the eval ran successfully
  expect(evals.Basics).toHaveLength(1);
  expect(evals.Basics![0]!.results).toHaveLength(1);
});

it("Should load testTimeout from evalite.config.ts", async () => {
  await using fixture = await loadFixture("evalite-timeout-config");

  const exit = vi.fn();

  globalThis.process.exit = exit as any;

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.adapter);

  // Verify the eval timed out
  expect(evals.Basics?.[0]?.status).toBe("fail");
  expect(exit).toHaveBeenCalledWith(1);
});

import { expect, it } from "vitest";
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

import { expect, it } from "vitest";
import { loadFixture, triggerWatchModeRerun } from "./test-utils.js";

it("Should handle watch mode reruns", async () => {
  await using fixture = await loadFixture("basics");

  // Start watch mode and get the Vitest instance
  // vitest.start() waits for initial run to complete before returning
  const vitest = await fixture.run({
    mode: "watch-for-file-changes",
    disableServer: true,
  });

  // Get the initial run (should already exist)
  const initialRuns = await fixture.storage.runs.getMany();
  expect(initialRuns).toHaveLength(1);
  expect(initialRuns[0]?.runType).toBe("full");

  // Trigger a rerun programmatically and wait for it to complete
  await triggerWatchModeRerun(vitest);

  // Verify storage has both runs
  const runs = await fixture.storage.runs.getMany({
    orderBy: "created_at",
    orderDirection: "asc",
  });

  expect(runs).toHaveLength(2);
  expect(runs[0]?.runType).toBe("full");
  expect(runs[1]?.runType).toBe("partial");
}, 10000);

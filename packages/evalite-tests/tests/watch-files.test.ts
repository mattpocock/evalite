import { expect, it } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("forceRerunTriggers in evalite.config.ts should configure Vitest forceRerunTriggers", async () => {
  await using fixture = await loadFixture("config-watchfiles");

  const vitest = await fixture.run({
    mode: "run-once-and-exit",
  });

  // Verify the forceRerunTriggers includes our configured triggers
  const forceRerunTriggers = vitest.config.forceRerunTriggers;

  expect(forceRerunTriggers).toContain("src/**/*.ts");
  expect(forceRerunTriggers).toContain("data/**/*.json");

  const suites = await getSuitesAsRecordViaStorage(fixture.storage);

  // Should complete successfully
  expect(suites["WatchFiles Config Test"]).toHaveLength(1);
  expect(suites["WatchFiles Config Test"]?.[0]?.status).toBe("success");
});

it("forceRerunTriggers passed to runEvalite should override evalite.config.ts", async () => {
  await using fixture = await loadFixture("config-watchfiles");

  // Override the config's forceRerunTriggers with different values
  const vitest = await fixture.run({
    mode: "run-once-and-exit",
    forceRerunTriggers: ["custom/**/*.md"],
  });

  const forceRerunTriggers = vitest.config.forceRerunTriggers;

  // Should contain the override value
  expect(forceRerunTriggers).toContain("custom/**/*.md");

  // Should NOT contain the config file values since we overrode them
  expect(forceRerunTriggers).not.toContain("src/**/*.ts");
  expect(forceRerunTriggers).not.toContain("data/**/*.json");
});

it("empty forceRerunTriggers array should not add any extra triggers", async () => {
  await using fixture = await loadFixture("config-watchfiles");

  // Override with empty array - should result in only Vitest defaults
  const vitest = await fixture.run({
    mode: "run-once-and-exit",
    forceRerunTriggers: [],
  });

  const forceRerunTriggers = vitest.config.forceRerunTriggers;

  // Should NOT contain the config file values since we overrode with empty array
  expect(forceRerunTriggers).not.toContain("src/**/*.ts");
  expect(forceRerunTriggers).not.toContain("data/**/*.json");
});

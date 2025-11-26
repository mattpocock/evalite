import { expect, it } from "vitest";
import { configDefaults } from "vitest/config";
import { getEvalsAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("forceRerunTriggers in evalite.config.ts should configure Vitest forceRerunTriggers", async () => {
  await using fixture = await loadFixture("config-watchfiles");

  const vitest = await fixture.run({
    mode: "run-once-and-exit",
  });

  // Verify the forceRerunTriggers includes our configured triggers
  const forceRerunTriggers = vitest.config.forceRerunTriggers;

  expect(forceRerunTriggers).toContain("src/**/*.ts");
  expect(forceRerunTriggers).toContain("data/**/*.json");

  // Verify Vitest defaults are preserved (use configDefaults to stay resilient to Vitest changes)
  for (const pattern of configDefaults.forceRerunTriggers) {
    expect(forceRerunTriggers).toContain(pattern);
  }

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  // Should complete successfully
  expect(evals["WatchFiles Config Test"]).toHaveLength(1);
  expect(evals["WatchFiles Config Test"]?.[0]?.status).toBe("success");
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

  // Should still include Vitest defaults
  for (const pattern of configDefaults.forceRerunTriggers) {
    expect(forceRerunTriggers).toContain(pattern);
  }
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

  // Should still include Vitest defaults (this verifies we didn't break anything)
  for (const pattern of configDefaults.forceRerunTriggers) {
    expect(forceRerunTriggers).toContain(pattern);
  }
});

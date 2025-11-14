import { expect, it } from "vitest";
import { loadFixture } from "./test-utils.js";

it("Should cache AI SDK in the task and scorers", async () => {
  await using fixture = await loadFixture("ai-sdk-caching");

  // First run - should log cache misses
  await fixture.run({
    mode: "run-once-and-exit",
    cacheDebug: true,
  });

  // Second run - should log cache hits
  await fixture.run({
    mode: "run-once-and-exit",
    cacheDebug: true,
  });

  const output = fixture.getOutput();

  const storage = fixture.storage;

  const runs = await storage.runs.getMany();

  expect(runs).toHaveLength(2);

  const allLogs = fixture.getOutput().split("\n");

  const cachelogs = allLogs.filter((log) => log.includes("[CACHE]"));
  expect(cachelogs.length).toBeGreaterThan(0);
  expect(cachelogs.some((log) => log.includes("Task cache HIT"))).toBe(true);
  expect(cachelogs.some((log) => log.includes("Scorer cache HIT"))).toBe(true);
  expect(cachelogs.some((log) => log.includes("saved"))).toBe(true);
});

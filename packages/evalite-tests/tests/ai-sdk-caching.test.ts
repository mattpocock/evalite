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

  const allLogs = fixture.getOutput().split("\n");

  const cachelogs = allLogs.filter((log) => log.includes("[CACHE]"));
  expect(cachelogs.length).toBeGreaterThan(0);
  expect(cachelogs.some((log) => log.includes("Task cache HIT"))).toBe(true);
  expect(cachelogs.some((log) => log.includes("Scorer cache HIT"))).toBe(true);
  expect(cachelogs.some((log) => log.includes("saved"))).toBe(true);
});

it("Should disable cache when cacheEnabled is false", async () => {
  await using fixture = await loadFixture("ai-sdk-caching");

  await fixture.run({
    mode: "run-once-and-exit",
    cacheDebug: true,
    cacheEnabled: false,
  });

  await fixture.run({
    mode: "run-once-and-exit",
    cacheDebug: true,
    cacheEnabled: false,
  });

  const allLogs = fixture.getOutput().split("\n");
  const cachelogs = allLogs.filter((log) => log.includes("[CACHE]"));
  expect(cachelogs.length).toBe(0);
});

it("Should respect cacheEnabled: false in config", async () => {
  await using fixture = await loadFixture("ai-sdk-caching-config-disabled");

  // First run
  await fixture.run({
    mode: "run-once-and-exit",
    cacheDebug: true,
  });

  // Second run - should still not cache because config disables it
  await fixture.run({
    mode: "run-once-and-exit",
    cacheDebug: true,
  });

  const allLogs = fixture.getOutput().split("\n");
  const cachelogs = allLogs.filter((log) => log.includes("[CACHE]"));
  expect(cachelogs.length).toBe(0);
});

it("Should let runEvalite cacheEnabled override config cacheEnabled", async () => {
  await using fixture = await loadFixture("ai-sdk-caching-config-precedence");

  // Config has cacheEnabled: true, but we override with false
  await fixture.run({
    mode: "run-once-and-exit",
    cacheDebug: true,
    cacheEnabled: false,
  });

  await fixture.run({
    mode: "run-once-and-exit",
    cacheDebug: true,
    cacheEnabled: false,
  });

  const allLogs = fixture.getOutput().split("\n");
  const cachelogs = allLogs.filter((log) => log.includes("[CACHE]"));
  // Should have no cache logs because runEvalite overrides config
  expect(cachelogs.length).toBe(0);
});

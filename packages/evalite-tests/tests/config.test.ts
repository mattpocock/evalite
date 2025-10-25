import { expect, it, vi } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should ignore includes in a vite.config.ts", async () => {
  await using fixture = await loadFixture("config-includes");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals.Basics).toHaveLength(1);
});

it("evalite.config.ts should override vite.config.ts for testTimeout and maxConcurrency", async () => {
  await using fixture = await loadFixture("config-precedence");

  await fixture.run({
    mode: "run-once-and-exit",
    configDebugMode: true,
  });

  const output = fixture.getOutput();

  // Verify evalite.config.ts values (60000, 10) override vite.config.ts values (5000, 2)
  expect(output).toContain("testTimeout: 60000");
  expect(output).toContain("maxConcurrency: 10");

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  // Should complete successfully without timing out
  expect(evals["Config Precedence Test"]).toHaveLength(1);
  expect(evals["Config Precedence Test"]?.[0]?.status).toBe("success");
});

it("setupFiles in evalite.config.ts should load environment variables", async () => {
  await using fixture = await loadFixture("config-setupfiles");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  // Should complete successfully with env var loaded
  expect(evals["Env Var Test"]).toHaveLength(1);
  expect(evals["Env Var Test"]?.[0]?.status).toBe("success");
  expect(evals["Env Var Test"]?.[0]?.evals[0]?.output).toBe(
    "test_value_from_env"
  );
});

it("setupFiles in vitest.config.ts should be supported", async () => {
  await using fixture = await loadFixture("config-setupfiles-vitest");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  // Should complete successfully with env var loaded from vitest.config.ts
  expect(evals["Vitest Setup Test"]).toHaveLength(1);
  expect(evals["Vitest Setup Test"]?.[0]?.status).toBe("success");
  expect(evals["Vitest Setup Test"]?.[0]?.evals[0]?.output).toBe(
    "from_vitest_config"
  );
});

it("setupFiles in evalite.config.ts should take precedence over vitest.config.ts", async () => {
  await using fixture = await loadFixture("config-setupfiles-precedence");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  // Should complete successfully with env var from evalite setup (which runs after vitest)
  expect(evals["Precedence Test"]).toHaveLength(1);
  expect(evals["Precedence Test"]?.[0]?.status).toBe("success");
  expect(evals["Precedence Test"]?.[0]?.evals[0]?.output).toBe("evalite");
});

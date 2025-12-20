import { expect, it, vi } from "vitest";
import { getEvalsAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should ignore includes in a vite.config.ts", async () => {
  await using fixture = await loadFixture("config-includes");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  expect(evals.Basics).toHaveLength(1);
});

it("evaluhealth.config.ts should override vite.config.ts for testTimeout and maxConcurrency", async () => {
  await using fixture = await loadFixture("config-precedence");

  await fixture.run({
    mode: "run-once-and-exit",
    configDebugMode: true,
  });

  const output = fixture.getOutput();

  // Verify evaluhealth.config.ts values (60000, 10) override vite.config.ts values (5000, 2)
  expect(output).toContain("testTimeout: 60000");
  expect(output).toContain("maxConcurrency: 10");

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  // Should complete successfully without timing out
  expect(evals["Config Precedence Test"]).toHaveLength(1);
  expect(evals["Config Precedence Test"]?.[0]?.status).toBe("success");
});

it("setupFiles in evaluhealth.config.ts should load environment variables", async () => {
  await using fixture = await loadFixture("config-setupfiles");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  // Should complete successfully with env var loaded
  expect(evals["Env Var Test"]).toHaveLength(1);
  expect(evals["Env Var Test"]?.[0]?.status).toBe("success");
  expect(evals["Env Var Test"]?.[0]?.results[0]?.output).toBe(
    "test_value_from_env"
  );
});

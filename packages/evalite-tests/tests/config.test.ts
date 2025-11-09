import { expect, it } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("testTimeout in evalite.config.ts should be applied", async () => {
  await using fixture = await loadFixture("config-timeout");

  await fixture.run({
    mode: "run-once-and-exit",
    configDebugMode: true,
  });

  const output = fixture.getOutput();

  // Verify testTimeout is applied
  expect(output).toContain("testTimeout: 60000");

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  // Should complete successfully without timing out
  expect(evals["Timeout Test"]).toHaveLength(1);
  expect(evals["Timeout Test"]?.[0]?.status).toBe("success");
});

it("maxConcurrency in evalite.config.ts should be applied", async () => {
  await using fixture = await loadFixture("config-concurrency");

  await fixture.run({
    mode: "run-once-and-exit",
    configDebugMode: true,
  });

  const output = fixture.getOutput();

  // Verify maxConcurrency is applied
  expect(output).toContain("maxConcurrency: 10");

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals["Concurrency Test"]).toHaveLength(1);
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

it("viteConfig in evalite.config.ts should be passed through to Vitest", async () => {
  await using fixture = await loadFixture("config-viteconfig");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  // Should complete successfully with globals enabled via viteConfig
  expect(evals["ViteConfig Test"]).toHaveLength(1);
  expect(evals["ViteConfig Test"]?.[0]?.status).toBe("success");
});

it("should throw error if viteConfig.test.testTimeout is set", async () => {
  await using fixture = await loadFixture("config-viteconfig-invalid-timeout");

  await expect(
    fixture.run({
      mode: "run-once-and-exit",
    })
  ).rejects.toThrow(/testTimeout.*evalite\.config\.ts/i);
});

it("should throw error if viteConfig.test.maxConcurrency is set", async () => {
  await using fixture = await loadFixture(
    "config-viteconfig-invalid-concurrency"
  );

  await expect(
    fixture.run({
      mode: "run-once-and-exit",
    })
  ).rejects.toThrow(/maxConcurrency.*evalite\.config\.ts/i);
});

it("should throw error if viteConfig.test.setupFiles is set", async () => {
  await using fixture = await loadFixture(
    "config-viteconfig-invalid-setupfiles"
  );

  await expect(
    fixture.run({
      mode: "run-once-and-exit",
    })
  ).rejects.toThrow(/setupFiles.*evalite\.config\.ts/i);
});

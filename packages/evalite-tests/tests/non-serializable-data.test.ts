import { createDatabase, getEvalsAsRecord } from "evalite/db";
import { runVitest } from "evalite/runner";
import { expect, it, vitest } from "vitest";
import { captureStdout, loadFixture } from "./test-utils.js";

it("Should allow non-serializable data (like validators/schemas) in expected field", async () => {
  using fixture = loadFixture("non-serializable-data");

  const captured = captureStdout();
  const exit = vitest.fn();
  globalThis.process.exit = exit as any;

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const output = captured.getOutput();

  // Should not have serialization errors
  expect(output).not.toContain("could not be cloned");

  // Should complete successfully
  expect(output).toContain("non-serializable-data.eval.ts");

  const db = createDatabase(fixture.dbLocation);
  const evals = await getEvalsAsRecord(db);

  // Should successfully run without serialization errors
  expect(evals["Non-serializable data"]).toBeDefined();
  expect(evals["Non-serializable data"]?.[0]?.status).toBe("success");
  expect(evals["Non-serializable data"]?.[0]?.results[0]?.status).toBe("success");

  // Should have a score of 1 (validator passed)
  expect(evals["Non-serializable data"]?.[0]?.results[0]?.scores[0]?.score).toBe(1);
  expect(evals["Non-serializable data"]?.[0]?.results[0]?.scores[0]?.name).toBe("Validator check");
});

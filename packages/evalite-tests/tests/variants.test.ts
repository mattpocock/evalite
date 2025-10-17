import { expect, it } from "vitest";
import { createSqliteAdapter } from "evalite/sqlite-adapter";
import { runEvalite } from "evalite/runner";
import { captureStdout, loadFixture } from "./test-utils.js";
import { getEvalsAsRecordViaAdapter } from "./test-utils.js";

it("Should create separate evals for each variant", async () => {
  using fixture = loadFixture("variants");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  await using adapter = await createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  // Should have 3 separate evals, one for each variant
  expect(evals["Compare models [Variant A]"]).toBeDefined();
  expect(evals["Compare models [Variant B]"]).toBeDefined();
  expect(evals["Compare models [Variant C]"]).toBeDefined();
});

it("Should store variant metadata in database", async () => {
  using fixture = loadFixture("variants");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  await using adapter = await createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  expect(evals["Compare models [Variant A]"]?.[0]).toMatchObject({
    variant_name: "Variant A",
    variant_group: "Compare models",
  });

  expect(evals["Compare models [Variant B]"]?.[0]).toMatchObject({
    variant_name: "Variant B",
    variant_group: "Compare models",
  });

  expect(evals["Compare models [Variant C]"]?.[0]).toMatchObject({
    variant_name: "Variant C",
    variant_group: "Compare models",
  });
});

it("Should pass correct variant value to task function", async () => {
  using fixture = loadFixture("variants");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  await using adapter = await createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  // Each variant should have results with different outputs based on variant value
  expect(evals["Compare models [Variant A]"]?.[0]?.results[0]?.output).toBe(
    "output-a"
  );
  expect(evals["Compare models [Variant B]"]?.[0]?.results[0]?.output).toBe(
    "output-b"
  );
  expect(evals["Compare models [Variant C]"]?.[0]?.results[0]?.output).toBe(
    "output-c"
  );
});

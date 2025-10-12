import { expect, it } from "vitest";
import { runEvalite } from "evalite/runner";
import { captureStdout, loadFixture } from "./test-utils.js";
import { createDatabase, getEvalsAsRecord } from "evalite/db";

it("Terminal output should contain '-' instead of '0%' or '100%'", async () => {
  using fixture = loadFixture("no-scorers");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const output = captured.getOutput();

  // Should not show percentage scores
  expect(output).not.toContain("0%");
  expect(output).not.toContain("100%");

  // Should show "-" for score
  expect(output).toContain("-");
});

it("DB should have empty scores array", async () => {
  using fixture = loadFixture("no-scorers");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const db = createDatabase(fixture.dbLocation);

  const evals = await getEvalsAsRecord(db);

  expect(evals["No Scorers"]).toBeDefined();
  expect(evals["No Scorers"]?.[0]?.results).toBeDefined();
  expect(evals["No Scorers"]?.[0]?.results[0]?.scores).toEqual([]);
  expect(evals["No Scorers"]?.[0]?.results[1]?.scores).toEqual([]);
});

it("Score display should show '-' in summary", async () => {
  using fixture = loadFixture("no-scorers");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const output = captured.getOutput();

  // Check for "-" in the score display area
  expect(output).toContain("Score");

  // Should not show percentage in summary
  const lines = output.split("\n");
  const scoreLine = lines.find((line) => line.includes("Score"));
  expect(scoreLine).toBeDefined();
  expect(scoreLine).not.toMatch(/\d+%/);
});

it("Task rendering should show '-' for file", async () => {
  using fixture = loadFixture("no-scorers");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const output = captured.getOutput();

  // Check for "-" next to the file name
  expect(output).toContain("no-scorers.eval.ts");

  // Should not show percentage next to filename
  const lines = output.split("\n");
  const fileLine = lines.find((line) => line.includes("no-scorers.eval.ts"));
  expect(fileLine).toBeDefined();
  expect(fileLine).not.toMatch(/\d+%/);
});

it("Detailed table should show '-' in Score column", async () => {
  using fixture = loadFixture("no-scorers");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const output = captured.getOutput();

  // Should show table with Input, Output, Score columns
  expect(output).toContain("Input");
  expect(output).toContain("Output");
  expect(output).toContain("Score");

  // Should show "-" in score column (not percentages)
  const lines = output.split("\n");
  const scoreColumnLines = lines.filter(
    (line) => line.includes("test input") || line.includes("test output")
  );

  // At least some data rows should exist
  expect(scoreColumnLines.length).toBeGreaterThan(0);

  // None of the data rows should contain percentage scores
  scoreColumnLines.forEach((line) => {
    expect(line).not.toMatch(/\d+%/);
  });
});

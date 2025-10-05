import { expect, it } from "vitest";
import { runVitest } from "evalite/runner";
import { captureStdout, loadFixture } from "./test-utils.js";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";

it("Should export results to JSON when outputPath is specified", async () => {
  using fixture = loadFixture("basics");

  const captured = captureStdout();
  const outputPath = path.join(fixture.dir, "results.json");

  await runVitest({
    cwd: fixture.dir,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
    outputPath,
    path: undefined,
  });

  // Verify the file was created
  expect(existsSync(outputPath)).toBe(true);

  // Read and parse the JSON file
  const fileContent = await readFile(outputPath, "utf-8");
  const results = JSON.parse(fileContent);

  // Verify the structure
  expect(results).toHaveProperty("runId");
  expect(results).toHaveProperty("runType");
  expect(results).toHaveProperty("created_at");
  expect(results).toHaveProperty("evals");

  // Verify the run type
  expect(results.runType).toBe("full");

  // Verify evals array
  expect(Array.isArray(results.evals)).toBe(true);
  expect(results.evals.length).toBeGreaterThan(0);

  // Verify each result has the expected properties
  results.evals.forEach((result: any) => {
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("eval_id");
    expect(result).toHaveProperty("duration");
    expect(result).toHaveProperty("input");
    expect(result).toHaveProperty("output");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("created_at");
    expect(result).toHaveProperty("col_order");
    expect(result).toHaveProperty("average");
    expect(result).toHaveProperty("scores");
    expect(Array.isArray(result.scores)).toBe(true);
  });
});

it("Should support relative output paths", async () => {
  using fixture = loadFixture("basics");

  const captured = captureStdout();
  const relativeOutputPath = "output/test-results.json";

  await runVitest({
    cwd: fixture.dir,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
    outputPath: relativeOutputPath,
    path: undefined,
  });

  const absoluteOutputPath = path.join(fixture.dir, relativeOutputPath);

  // Verify the file was created at the correct location
  expect(existsSync(absoluteOutputPath)).toBe(true);

  // Verify it's valid JSON
  const fileContent = await readFile(absoluteOutputPath, "utf-8");
  const results = JSON.parse(fileContent);

  expect(results).toHaveProperty("evals");
});

it("Should create nested directories if they don't exist", async () => {
  using fixture = loadFixture("basics");

  const captured = captureStdout();
  const nestedOutputPath = path.join(
    fixture.dir,
    "deeply",
    "nested",
    "path",
    "results.json",
  );

  await runVitest({
    cwd: fixture.dir,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
    outputPath: nestedOutputPath,
    path: undefined,
  });

  // Verify the file was created
  expect(existsSync(nestedOutputPath)).toBe(true);

  // Verify it contains valid data
  const fileContent = await readFile(nestedOutputPath, "utf-8");
  const results = JSON.parse(fileContent);

  expect(results.evals.length).toBeGreaterThan(0);
});

it("Should include result scores in the output", async () => {
  using fixture = loadFixture("basics");

  const captured = captureStdout();
  const outputPath = path.join(fixture.dir, "results.json");

  await runVitest({
    cwd: fixture.dir,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
    outputPath,
    path: undefined,
  });

  const fileContent = await readFile(outputPath, "utf-8");
  const results = JSON.parse(fileContent);

  // Verify that each result has an average score and individual scores
  results.evals.forEach((result: any) => {
    expect(typeof result.average).toBe("number");
    expect(result.average).toBeGreaterThanOrEqual(0);
    expect(result.average).toBeLessThanOrEqual(1);

    expect(Array.isArray(result.scores)).toBe(true);
    result.scores.forEach((score: any) => {
      expect(score).toHaveProperty("id");
      expect(score).toHaveProperty("result_id");
      expect(score).toHaveProperty("name");
      expect(score).toHaveProperty("score");
      expect(typeof score.score).toBe("number");
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1);
    });
  });
});

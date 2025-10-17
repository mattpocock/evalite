import { expect, it } from "vitest";
import { runEvalite } from "evalite/runner";
import { captureStdout, loadFixture } from "./test-utils.js";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";

it("Should export results to JSON when outputPath is specified", async () => {
  using fixture = loadFixture("basics");

  const captured = captureStdout();
  const outputPath = path.join(fixture.dir, "results.json");

  await runEvalite({
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
  const output = JSON.parse(fileContent);

  // Verify run structure
  expect(output).toHaveProperty("run");
  expect(output.run).toHaveProperty("id");
  expect(output.run).toHaveProperty("runType");
  expect(output.run).toHaveProperty("createdAt");
  expect(output.run.runType).toBe("full");

  // Verify evals array
  expect(output).toHaveProperty("evals");
  expect(Array.isArray(output.evals)).toBe(true);
  expect(output.evals.length).toBeGreaterThan(0);

  // Verify each eval has the expected properties
  output.evals.forEach((evaluation: any) => {
    expect(evaluation).toHaveProperty("id");
    expect(evaluation).toHaveProperty("name");
    expect(evaluation).toHaveProperty("filepath");
    expect(evaluation).toHaveProperty("duration");
    expect(evaluation).toHaveProperty("status");
    expect(evaluation).toHaveProperty("createdAt");
    expect(evaluation).toHaveProperty("averageScore");
    expect(evaluation).toHaveProperty("results");
    expect(Array.isArray(evaluation.results)).toBe(true);

    // Verify each result in the eval
    evaluation.results.forEach((result: any) => {
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("input");
      expect(result).toHaveProperty("output");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("colOrder");
      expect(result).toHaveProperty("averageScore");
      expect(result).toHaveProperty("scores");
      expect(result).toHaveProperty("traces");
      expect(Array.isArray(result.scores)).toBe(true);
      expect(Array.isArray(result.traces)).toBe(true);
    });
  });
});

it("Should support relative output paths", async () => {
  using fixture = loadFixture("basics");

  const captured = captureStdout();
  const relativeOutputPath = "output/test-results.json";

  await runEvalite({
    cwd: fixture.dir,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
    outputPath: relativeOutputPath,
    path: undefined,
  });

  const absoluteOutputPath = path.join(fixture.dir, relativeOutputPath);

  // Verify the file was created at the correct location
  expect(existsSync(absoluteOutputPath)).toBe(true);

  // Verify it's valid JSON with correct structure
  const fileContent = await readFile(absoluteOutputPath, "utf-8");
  const output = JSON.parse(fileContent);

  expect(output).toHaveProperty("run");
  expect(output).toHaveProperty("evals");
});

it("Should create nested directories if they don't exist", async () => {
  using fixture = loadFixture("basics");

  const captured = captureStdout();
  const nestedOutputPath = path.join(
    fixture.dir,
    "deeply",
    "nested",
    "path",
    "results.json"
  );

  await runEvalite({
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
  const output = JSON.parse(fileContent);

  expect(output.evals.length).toBeGreaterThan(0);
});

it("Should include result scores in the output", async () => {
  using fixture = loadFixture("basics");

  const captured = captureStdout();
  const outputPath = path.join(fixture.dir, "results.json");

  await runEvalite({
    cwd: fixture.dir,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
    outputPath,
    path: undefined,
  });

  const fileContent = await readFile(outputPath, "utf-8");
  const output = JSON.parse(fileContent);

  // Verify that each eval has an average score
  output.evals.forEach((evaluation: any) => {
    expect(typeof evaluation.averageScore).toBe("number");
    expect(evaluation.averageScore).toBeGreaterThanOrEqual(0);
    expect(evaluation.averageScore).toBeLessThanOrEqual(1);

    // Verify that each result has an average score and individual scores
    evaluation.results.forEach((result: any) => {
      expect(typeof result.averageScore).toBe("number");
      expect(result.averageScore).toBeGreaterThanOrEqual(0);
      expect(result.averageScore).toBeLessThanOrEqual(1);

      expect(Array.isArray(result.scores)).toBe(true);
      result.scores.forEach((score: any) => {
        expect(score).toHaveProperty("id");
        expect(score).toHaveProperty("name");
        expect(score).toHaveProperty("score");
        expect(typeof score.score).toBe("number");
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(1);
      });
    });
  });
});

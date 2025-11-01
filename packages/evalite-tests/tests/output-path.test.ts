import { expect, it } from "vitest";
import { runEvalite } from "evalite/runner";
import { captureStdout, loadFixture } from "./test-utils.js";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import type { Evalite } from "evalite";

it("Should export results to JSON when outputPath is specified", async () => {
  await using fixture = await loadFixture("basics");

  await fixture.run({
    mode: "run-once-and-exit",
    outputPath: path.join(fixture.dir, "results.json"),
  });

  const outputPath = path.join(fixture.dir, "results.json");

  // Verify the file was created
  expect(existsSync(outputPath)).toBe(true);

  // Read and parse the JSON file
  const fileContent = await readFile(outputPath, "utf-8");
  const output: Evalite.Exported.Output = JSON.parse(fileContent);

  // Verify run structure
  expect(output).toHaveProperty("run");
  expect(output.run).toHaveProperty("id");
  expect(output.run).toHaveProperty("runType");
  expect(output.run).toHaveProperty("createdAt");
  expect(output.run.runType).toBe("full");

  // Verify evals array
  expect(output).toHaveProperty("suites");
  expect(Array.isArray(output.suites)).toBe(true);
  expect(output.suites.length).toBeGreaterThan(0);

  // Verify each eval has the expected properties
  output.suites.forEach((suite) => {
    expect(suite).toHaveProperty("id");
    expect(suite).toHaveProperty("name");
    expect(suite).toHaveProperty("filepath");
    expect(suite).toHaveProperty("duration");
    expect(suite).toHaveProperty("status");
    expect(suite).toHaveProperty("createdAt");
    expect(suite).toHaveProperty("averageScore");
    expect(suite).toHaveProperty("evals");
    expect(Array.isArray(suite.evals)).toBe(true);

    // Verify each result in the eval
    suite.evals.forEach((_eval) => {
      expect(_eval).toHaveProperty("id");
      expect(_eval).toHaveProperty("duration");
      expect(_eval).toHaveProperty("input");
      expect(_eval).toHaveProperty("output");
      expect(_eval).toHaveProperty("status");
      expect(_eval).toHaveProperty("createdAt");
      expect(_eval).toHaveProperty("colOrder");
      expect(_eval).toHaveProperty("averageScore");
      expect(_eval).toHaveProperty("scores");
      expect(_eval).toHaveProperty("traces");
      expect(Array.isArray(_eval.scores)).toBe(true);
      expect(Array.isArray(_eval.traces)).toBe(true);
    });
  });
});

it("Should support relative output paths", async () => {
  await using fixture = await loadFixture("basics");

  await fixture.run({
    mode: "run-once-and-exit",
    outputPath: "output/test-results.json",
  });

  const relativeOutputPath = "output/test-results.json";
  const absoluteOutputPath = path.join(fixture.dir, relativeOutputPath);

  // Verify the file was created at the correct location
  expect(existsSync(absoluteOutputPath)).toBe(true);

  // Verify it's valid JSON with correct structure
  const fileContent = await readFile(absoluteOutputPath, "utf-8");
  const output = JSON.parse(fileContent);

  expect(output).toHaveProperty("run");
  expect(output).toHaveProperty("suites");
});

it("Should create nested directories if they don't exist", async () => {
  await using fixture = await loadFixture("basics");

  await fixture.run({
    mode: "run-once-and-exit",
    outputPath: "deeply/nested/path/results.json",
  });

  const outputPath = path.join(fixture.dir, "deeply/nested/path/results.json");
  expect(existsSync(outputPath)).toBe(true);

  const output: Evalite.Exported.Output = JSON.parse(
    await readFile(outputPath, "utf-8")
  );
  expect(output.suites.length).toBeGreaterThan(0);
});

it("Should include result scores in the output", async () => {
  await using fixture = await loadFixture("basics");

  await fixture.run({
    mode: "run-once-and-exit",
    outputPath: "results.json",
  });

  const outputPath = path.join(fixture.dir, "results.json");
  const fileContent = await readFile(outputPath, "utf-8");
  const output: Evalite.Exported.Output = JSON.parse(fileContent);

  // Verify that each eval has an average score
  output.suites.forEach((suite) => {
    expect(typeof suite.averageScore).toBe("number");
    expect(suite.averageScore).toBeGreaterThanOrEqual(0);
    expect(suite.averageScore).toBeLessThanOrEqual(1);

    // Verify that each result has an average score and individual scores
    suite.evals.forEach((_eval) => {
      expect(typeof _eval.averageScore).toBe("number");
      expect(_eval.averageScore).toBeGreaterThanOrEqual(0);
      expect(_eval.averageScore).toBeLessThanOrEqual(1);

      expect(Array.isArray(_eval.scores)).toBe(true);
      _eval.scores.forEach((score) => {
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

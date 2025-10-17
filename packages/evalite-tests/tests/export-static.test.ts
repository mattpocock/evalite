import { runVitest } from "evalite/runner";
import { exportStaticUI } from "evalite/export-static";
import { createSqliteAdapter } from "evalite/sqlite-adapter";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { captureStdout, loadFixture } from "./test-utils.js";

it("Should export all required files and directory structure", async () => {
  using fixture = loadFixture("export");

  const captured = captureStdout();

  // Run the eval first
  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  // Export to a temp directory
  const exportDir = path.join(fixture.dir, "evalite-export");

  await using adapter = createSqliteAdapter(fixture.dbLocation);

  await exportStaticUI({
    adapter,
    outputPath: exportDir,
  });

  // Verify data directory and files
  const dataDir = path.join(exportDir, "data");
  const dataFiles = await readdir(dataDir);

  expect(dataFiles).toContain("server-state.json");
  expect(dataFiles).toContain("menu-items.json");
  expect(dataFiles).toContain("eval-Export.json");
  expect(dataFiles).toContain("result-Export-0.json");

  // Verify files directory exists and has content
  const filesDir = path.join(exportDir, "files");
  const files = await readdir(filesDir);
  expect(files.length).toBeGreaterThan(0);

  // Verify UI assets
  const indexHtmlPath = path.join(exportDir, "index.html");
  const indexHtml = await readFile(indexHtmlPath, "utf-8");
  expect(indexHtml).toBeTruthy();

  const assetsDir = path.join(exportDir, "assets");
  const assetFiles = await readdir(assetsDir);
  expect(assetFiles.length).toBeGreaterThan(0);
});

it("Should remap file paths to unique filenames", async () => {
  using fixture = loadFixture("export");

  const captured = captureStdout();

  // Run the eval first
  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  // Export to a temp directory
  const exportDir = path.join(fixture.dir, "evalite-export");
  await using adapter = createSqliteAdapter(fixture.dbLocation);

  await exportStaticUI({
    adapter,
    outputPath: exportDir,
  });

  // Read eval JSON
  const evalJsonPath = path.join(exportDir, "data", "eval-Export.json");
  const evalJson = JSON.parse(await readFile(evalJsonPath, "utf-8"));

  // Check that file paths are remapped (should be UUID-style filenames)
  const firstResult = evalJson.evaluation.results[0];
  expect(firstResult.output).toMatchObject({
    __EvaliteFile: true,
    path: expect.stringMatching(/^[a-f0-9-]+\.png$/),
  });

  // Verify the file exists in files directory
  const filesDir = path.join(exportDir, "files");
  const files = await readdir(filesDir);
  expect(files).toContain(firstResult.output.path);

  // Check trace has remapped paths
  const resultJsonPath = path.join(exportDir, "data", "result-Export-0.json");
  const resultJson = JSON.parse(await readFile(resultJsonPath, "utf-8"));
  const trace = resultJson.result.traces[0];
  expect(trace.output).toMatchObject({
    __EvaliteFile: true,
    path: expect.stringMatching(/^[a-f0-9-]+\.png$/),
  });

  // Check columns have remapped paths
  expect(firstResult.rendered_columns[0].value).toMatchObject({
    __EvaliteFile: true,
    path: expect.stringMatching(/^[a-f0-9-]+\.png$/),
  });
});

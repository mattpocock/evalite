import type { Evalite } from "evalite";
import { exportStaticUI } from "evalite/export-static";
import { createInMemoryStorage } from "evalite/in-memory-storage";
import { runEvalite } from "evalite/runner";
import { createSqliteStorage } from "evalite/sqlite-storage";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { assert, expect, it } from "vitest";
import { loadFixture } from "./test-utils.js";

it("Should export all required files and directory structure", async () => {
  await using fixture = await loadFixture("export");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  // Export to a temp directory
  const exportDir = path.join(fixture.dir, "evalite-export");

  await exportStaticUI({
    storage: fixture.storage,
    outputPath: exportDir,
  });

  // Verify data directory and files
  const dataDir = path.join(exportDir, "data");
  const dataFiles = await readdir(dataDir);

  expect(dataFiles).toContain("server-state.json");
  expect(dataFiles).toContain("menu-items.json");
  expect(dataFiles).toContain("suite-Export.json");
  expect(dataFiles).toContain("eval-Export-0.json");

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
  await using fixture = await loadFixture("export");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  // Export to a temp directory
  const exportDir = path.join(fixture.dir, "evalite-export");

  await exportStaticUI({
    storage: fixture.storage,
    outputPath: exportDir,
  });

  // Read eval JSON
  const suiteJsonPath = path.join(exportDir, "data", "suite-Export.json");
  const suiteJson: Evalite.SDK.GetSuiteByNameResult = JSON.parse(
    await readFile(suiteJsonPath, "utf-8")
  );

  // Check that file paths are remapped (should be UUID-style filenames)
  const firstEval = suiteJson.suite.evals[0];
  assert(firstEval);
  expect(firstEval.output).toMatchObject({
    __EvaliteFile: true,
    path: expect.stringMatching(/^[a-f0-9-]+\.png$/),
  });

  // Verify the file exists in files directory
  const filesDir = path.join(exportDir, "files");
  const files = await readdir(filesDir);
  expect(files).toContain((firstEval.output as Evalite.File).path);

  // Check trace has remapped paths
  const evalJsonPath = path.join(exportDir, "data", "eval-Export-0.json");
  const evalJson: Evalite.SDK.GetEvalResult = JSON.parse(
    await readFile(evalJsonPath, "utf-8")
  );
  const trace = evalJson.eval.traces[0];
  assert(trace);
  expect(trace.output).toMatchObject({
    __EvaliteFile: true,
    path: expect.stringMatching(/^[a-f0-9-]+\.png$/),
  });

  // Check columns have remapped paths
  expect((firstEval.rendered_columns as any)[0].value).toMatchObject({
    __EvaliteFile: true,
    path: expect.stringMatching(/^[a-f0-9-]+\.png$/),
  });
});

it("Should error when runId specified but run not found", async () => {
  const storage = createInMemoryStorage();
  const exportDir = "./test-export";

  await expect(
    exportStaticUI({
      storage,
      outputPath: exportDir,
      runId: 999,
    })
  ).rejects.toThrow("Run with ID 999 not found");

  await storage.close();
});

it("Should error when no runs found in storage", async () => {
  const storage = createInMemoryStorage();
  const exportDir = "./test-export";

  // Empty storage should error when trying to export
  await expect(
    exportStaticUI({
      storage,
      outputPath: exportDir,
    })
  ).rejects.toThrow("No runs found");

  await storage.close();
});

it("Should export existing data from SQLite storage", async () => {
  await using fixture = await loadFixture("export");

  // Create SQLite storage and run evals with it
  const dbPath = path.join(
    fixture.dir,
    "node_modules",
    ".evalite",
    "cache.sqlite"
  );
  await using sqliteStorage = await createSqliteStorage(dbPath);

  await runEvalite({
    cwd: fixture.dir,
    mode: "run-once-and-exit",
    storage: sqliteStorage,
  });

  const exportDir = path.join(fixture.dir, "sqlite-export");

  await exportStaticUI({
    storage: sqliteStorage,
    outputPath: exportDir,
  });
});

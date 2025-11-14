import type { Evalite } from "evalite";
import { exportCommand, exportStaticUI } from "evalite/export-static";
import { createInMemoryStorage } from "evalite/in-memory-storage";
import { runEvalite } from "evalite/runner";
import { createSqliteStorage } from "evalite/sqlite-storage";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { assert, expect, it } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should export all required files and directory structure", async () => {
  await using fixture = await loadFixture("export");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  // Export to a temp directory
  const exportDir = path.join(fixture.dir, "evalite-export");

  await exportCommand({
    cwd: fixture.dir,
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

  await exportCommand({
    cwd: fixture.dir,
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

it("Should use default basePath of / when not specified", async () => {
  await using fixture = await loadFixture("export");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const exportDir = path.join(fixture.dir, "evalite-export");

  await exportCommand({
    cwd: fixture.dir,
    storage: fixture.storage,
    outputPath: exportDir,
  });

  const indexHtml = await readFile(path.join(exportDir, "index.html"), "utf-8");

  // Should have root-relative paths
  expect(indexHtml).toContain('src="/assets/');
  expect(indexHtml).toContain('href="/assets/');
  expect(indexHtml).toContain('href="/assets/favicon.ico"');
  expect(indexHtml).toContain('href="/assets/favicon.svg"');

  // Should inject basePath into window config
  expect(indexHtml).toContain("window.__EVALITE_STATIC_DATA__");
  expect(indexHtml).toContain('basePath: "/"');
});

it("Should prefix all paths with custom basePath", async () => {
  await using fixture = await loadFixture("export");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const exportDir = path.join(fixture.dir, "evalite-export");

  await exportCommand({
    cwd: fixture.dir,
    storage: fixture.storage,
    outputPath: exportDir,
    basePath: "/evals-123",
  });

  const indexHtml = await readFile(path.join(exportDir, "index.html"), "utf-8");

  // Should have basePath-prefixed paths
  expect(indexHtml).toContain('src="/evals-123/assets/');
  expect(indexHtml).toContain('href="/evals-123/assets/');
  expect(indexHtml).toContain('href="/evals-123/assets/favicon.ico"');
  expect(indexHtml).toContain('href="/evals-123/assets/favicon.svg"');

  // Should inject basePath into window config
  expect(indexHtml).toContain('basePath: "/evals-123"');
});

it("Should throw error if basePath missing leading slash", async () => {
  await using fixture = await loadFixture("export");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const exportDir = path.join(fixture.dir, "evalite-export");

  // Should throw error
  await expect(
    exportCommand({
      cwd: fixture.dir,
      storage: fixture.storage,
      outputPath: exportDir,
      basePath: "evals-123", // No leading slash
    })
  ).rejects.toThrow('basePath must start with "/"');
});

it("Should normalize basePath with trailing slash", async () => {
  await using fixture = await loadFixture("export");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const exportDir = path.join(fixture.dir, "evalite-export");

  await exportCommand({
    cwd: fixture.dir,
    storage: fixture.storage,
    outputPath: exportDir,
    basePath: "/evals-123/", // Trailing slash
  });

  const indexHtml = await readFile(path.join(exportDir, "index.html"), "utf-8");

  // Should have no double slashes
  expect(indexHtml).toContain('src="/evals-123/assets/');
  expect(indexHtml).not.toContain('src="/evals-123//assets/');
  expect(indexHtml).toContain('basePath: "/evals-123"');
});

it("Should handle multi-level basePath", async () => {
  await using fixture = await loadFixture("export");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const exportDir = path.join(fixture.dir, "evalite-export");

  await exportCommand({
    cwd: fixture.dir,
    storage: fixture.storage,
    outputPath: exportDir,
    basePath: "/reports/evals/run-123",
  });

  const indexHtml = await readFile(path.join(exportDir, "index.html"), "utf-8");

  // Should have basePath-prefixed paths
  expect(indexHtml).toContain('src="/reports/evals/run-123/assets/');
  expect(indexHtml).toContain(
    'href="/reports/evals/run-123/assets/favicon.ico"'
  );
  expect(indexHtml).toContain(
    'href="/reports/evals/run-123/assets/favicon.svg"'
  );
  expect(indexHtml).toContain('basePath: "/reports/evals/run-123"');
});

it("Should rewrite /assets/ paths in JS files with custom basePath", async () => {
  await using fixture = await loadFixture("export");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const exportDir = path.join(fixture.dir, "evalite-export");

  await exportCommand({
    cwd: fixture.dir,
    storage: fixture.storage,
    outputPath: exportDir,
    basePath: "/evals-123",
  });

  // Read all .js files from assets directory
  const assetsDir = path.join(exportDir, "assets");
  const assetFiles = await readdir(assetsDir);
  const jsFiles = assetFiles.filter((file) => file.endsWith(".js"));

  expect(jsFiles.length).toBeGreaterThan(0);

  let jsFilesWithAssetReferences = 0;

  // Check each JS file for proper path rewriting
  for (const jsFile of jsFiles) {
    const jsContent = await readFile(path.join(assetsDir, jsFile), "utf-8");

    // Should not contain root-relative /assets/ paths or non-prefixed assets/ paths
    expect(jsContent).not.toContain('"/assets/');
    expect(jsContent).not.toContain("'/assets/");
    expect(jsContent).not.toContain('"assets/');
    expect(jsContent).not.toContain("'assets/");

    // If the file contains asset references, they should be prefixed with basePath
    if (jsContent.includes("evals-123/assets/")) {
      expect(jsContent).toContain('"evals-123/assets/');
      jsFilesWithAssetReferences++;
    }
  }

  const cssFiles = assetFiles.filter((file) => file.endsWith(".css"));

  for (const cssFile of cssFiles) {
    const cssContent = await readFile(path.join(assetsDir, cssFile), "utf-8");

    // Should not contain root-relative /assets/ paths or non-prefixed assets/ paths
    expect(cssContent).not.toContain('"/assets/');
    expect(cssContent).not.toContain("'/assets/");
    expect(cssContent).not.toContain('"assets/');
    expect(cssContent).not.toContain("'assets/");
  }

  expect(jsFilesWithAssetReferences).toBeGreaterThan(0);
});

it("Should run evaluations if storage is empty", async () => {
  await using fixture = await loadFixture("export");

  await exportCommand({
    cwd: fixture.dir,
    storage: fixture.storage,
    outputPath: path.join(fixture.dir, "evalite-export"),
  });

  const exportDir = path.join(fixture.dir, "evalite-export");

  // Verify data directory and files
  const dataDir = path.join(exportDir, "data");
  const dataFiles = await readdir(dataDir);

  expect(dataFiles).toContain("server-state.json");
  expect(dataFiles).toContain("menu-items.json");
  expect(dataFiles).toContain("suite-Export.json");
  expect(dataFiles).toContain("eval-Export-0.json");
});

it("Should export evaluations even if the run fails", async () => {
  await using fixture = await loadFixture("failing-test");

  await exportCommand({
    cwd: fixture.dir,
    storage: fixture.storage,
    outputPath: path.join(fixture.dir, "evalite-export"),
  });

  const exportDir = path.join(fixture.dir, "evalite-export");

  // Verify data directory and files
  const dataDir = path.join(exportDir, "data");
  const dataFiles = await readdir(dataDir);

  expect(dataFiles).toContain("server-state.json");
  expect(dataFiles).toContain("menu-items.json");
  expect(dataFiles).toContain("suite-Failing.json");
  expect(dataFiles).toContain("eval-Failing-0.json");
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
    storage: sqliteStorage,
    mode: "run-once-and-exit",
  });

  const exportDir = path.join(fixture.dir, "sqlite-export");

  await exportStaticUI({
    storage: sqliteStorage,
    outputPath: exportDir,
  });
});

it("Should calculate summary score correctly in menu-items.json (issue 331)", async () => {
  await using fixture = await loadFixture("issue-331");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const exportDir = path.join(fixture.dir, "evalite-export");

  await exportCommand({
    cwd: fixture.dir,
    storage: fixture.storage,
    outputPath: exportDir,
  });

  // Read menu-items.json
  const menuItemsPath = path.join(exportDir, "data", "menu-items.json");
  const menuItemsData: Evalite.SDK.GetMenuItemsResult = JSON.parse(
    await readFile(menuItemsPath, "utf-8")
  );

  // Expected scores:
  // Eval 1: 1/2 = 0.5 (1 pass, 1 fail)
  // Eval 2: 3/3 = 1.0 (all pass)
  // Eval 3: 4/4 = 1.0 (all pass)
  // Average: (0.5 + 1.0 + 1.0) / 3 = 0.8333...

  expect(menuItemsData.suites).toHaveLength(3);

  // Find each suite by name and verify scores
  const eval1 = menuItemsData.suites.find((s) => s.name === "Eval 1");
  const eval2 = menuItemsData.suites.find((s) => s.name === "Eval 2");
  const eval3 = menuItemsData.suites.find((s) => s.name === "Eval 3");

  expect(eval1?.score).toBe(0.5);
  expect(eval2?.score).toBe(1);
  expect(eval3?.score).toBe(1);

  // Verify summary score is the average of all suite scores (not 0 due to variable shadowing)
  const expectedAverage = (0.5 + 1.0 + 1.0) / 3;
  expect(menuItemsData.score).toBeCloseTo(expectedAverage, 5);
});

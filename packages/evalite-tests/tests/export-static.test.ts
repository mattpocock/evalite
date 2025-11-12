import { exportStaticUI } from "evalite/export-static";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { getEvalsAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should export all required files and directory structure", async () => {
  await using fixture = await loadFixture("export");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  // Export to a temp directory
  const exportDir = path.join(fixture.dir, "evalite-export");
  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  await exportStaticUI({
    storage: fixture.storage,
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

it("Should use default basePath of / when not specified", async () => {
  await using fixture = await loadFixture("export");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const exportDir = path.join(fixture.dir, "evalite-export");

  await exportStaticUI({
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

  await exportStaticUI({
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
    exportStaticUI({
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

  await exportStaticUI({
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

  await exportStaticUI({
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

  await exportStaticUI({
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
      expect(jsContent).toContain('"/evals-123/assets/');
      jsFilesWithAssetReferences++;
    }
  }

  expect(jsFilesWithAssetReferences).toBeGreaterThan(0);
});

it("Should fail with empty storage (issue #324)", async () => {
  // This test demonstrates the bug described in issue #324:
  // Running `evalite export` with empty in-memory storage should:
  // 1. Detect storage is empty
  // 2. Automatically run evaluations first
  // 3. Continue to export (not exit after running)
  //
  // Currently it fails because exportStaticUI throws "No runs found in database"
  // when storage is empty, or if auto-run logic exists, it exits before exporting.

  await using fixture = await loadFixture("export");

  // Export directory without running evals first - storage is empty
  const exportDir = path.join(fixture.dir, "evalite-export");

  // This currently throws "No runs found in database. Please run evaluations first."
  // The intended behavior is to auto-run the evaluations and then export.
  await exportStaticUI({
    storage: fixture.storage,
    outputPath: exportDir,
  });

  // If the bug is fixed, these assertions should pass:
  const dataDir = path.join(exportDir, "data");
  const dataFiles = await readdir(dataDir);

  expect(dataFiles).toContain("server-state.json");
  expect(dataFiles).toContain("menu-items.json");
  expect(dataFiles).toContain("eval-Export.json");
  expect(dataFiles).toContain("result-Export-0.json");

  const indexHtmlPath = path.join(exportDir, "index.html");
  const indexHtml = await readFile(indexHtmlPath, "utf-8");
  expect(indexHtml).toBeTruthy();

  const assetsDir = path.join(exportDir, "assets");
  const assetFiles = await readdir(assetsDir);
  expect(assetFiles.length).toBeGreaterThan(0);
});

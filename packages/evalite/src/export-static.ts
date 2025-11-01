import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { Evalite } from "./types.js";
import { average, EvaliteFile } from "./utils.js";
import { computeAverageScores } from "./storage/utils.js";

/**
 * Sanitizes an eval name for use in filenames
 */
const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
};

/**
 * Get the previous completed suite by name and created_at time
 */
const getPreviousCompletedSuite = async (
  storage: Evalite.Storage,
  name: string,
  createdAt: string
): Promise<Evalite.Storage.Entities.Suite | undefined> => {
  const suites = await storage.suites.getMany({
    name,
    createdBefore: createdAt,
    statuses: ["success", "fail"],
    limit: 1,
    orderBy: "created_at",
    orderDirection: "desc",
  });
  return suites[0];
};

/**
 * Get historical evals with average scores by name
 */
const getHistoricalEvalsWithScoresByName = async (
  storage: Evalite.Storage,
  name: string
): Promise<(Evalite.Storage.Entities.Suite & { average_score: number })[]> => {
  const suites = await storage.suites.getMany({
    name,
    statuses: ["success", "fail"],
    orderBy: "created_at",
    orderDirection: "asc",
  });

  // Get evals and scores for all suites
  const allEvals = await storage.evals.getMany({
    suiteIds: suites.map((s) => s.id),
  });
  const allScores = await storage.scores.getMany({
    evalIds: allEvals.map((r) => r.id),
  });

  // Calculate average scores for each eval
  return suites.map((suite) => {
    const evals = allEvals.filter((e) => e.suite_id === suite.id);
    const scores = allScores.filter((s) =>
      evals.some((e) => e.id === s.eval_id)
    );
    const average_score =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
        : 0;
    return { ...suite, average_score };
  });
};

/**
 * Transforms EvaliteFile paths using a provided callback
 * Recursively walks through objects, arrays, and EvaliteFile instances
 * @param value The value to transform
 * @param transformPath Callback that receives an EvaliteFile and returns the new path
 */
const transformEvaliteFilePaths = (
  value: unknown,
  transformPath: (file: Evalite.File) => string
): unknown => {
  if (EvaliteFile.isEvaliteFile(value)) {
    return {
      __EvaliteFile: true,
      path: transformPath(value),
    };
  }

  if (Array.isArray(value)) {
    return value.map((v) => transformEvaliteFilePaths(v, transformPath));
  }

  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = transformEvaliteFilePaths(val, transformPath);
    }
    return result;
  }

  return value;
};

/**
 * Options for exporting static UI
 */
export interface ExportStaticOptions {
  /** Storage instance for accessing evaluation data */
  storage: Evalite.Storage;
  /** Output directory path for the export */
  outputPath: string;
  /** Optional specific run ID to export (defaults to latest full run) */
  runId?: number;
}

/**
 * Exports the Evalite UI as a static bundle with pre-computed JSON files
 */
export const exportStaticUI = async (
  options: ExportStaticOptions
): Promise<void> => {
  const { storage, outputPath, runId } = options;

  // Get the run to export
  const run = runId
    ? (await storage.runs.getMany({ ids: [runId] }))[0]
    : (await storage.runs.getMany({ runType: "full", limit: 1 }))[0];

  if (!run) {
    throw new Error(
      runId
        ? `Run with ID ${runId} not found`
        : "No runs found in database. Please run evaluations first."
    );
  }

  console.log(`Exporting run #${run.id} (${run.runType})...`);

  // Create output directory structure
  const dataDir = path.join(outputPath, "data");
  const filesDir = path.join(outputPath, "files");
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(filesDir, { recursive: true });

  // Get all data for this run
  const suites = await storage.suites.getMany({
    runIds: [run.id],
    statuses: ["success", "fail"],
  });
  console.log(`Found ${suites.length} suites`);

  const allEvals = await storage.evals.getMany({
    suiteIds: suites.map((s) => s.id),
  });
  const allScores = await storage.scores.getMany({
    evalIds: allEvals.map((e) => e.id),
  });
  const allTraces = await storage.traces.getMany({
    evalIds: allEvals.map((e) => e.id),
  });
  const averageScores = computeAverageScores(allScores);

  // Create file path mapper: original path -> unique filename
  const filePathMapper = new Map<string, string>();

  /**
   * Transform callback that generates unique filenames for files
   * and tracks them in the mapper for later copying
   */
  const getUniqueFilename = (file: Evalite.File): string => {
    const originalPath = file.path;

    // Check if we've already mapped this file
    if (filePathMapper.has(originalPath)) {
      return filePathMapper.get(originalPath)!;
    }

    // Generate unique filename with original extension
    const ext = path.extname(originalPath);
    const uniqueFilename = `${crypto.randomUUID()}${ext}`;

    // Store mapping
    filePathMapper.set(originalPath, uniqueFilename);

    return uniqueFilename;
  };

  // Generate server-state.json
  const serverState: Evalite.ServerState = {
    type: "idle",
  };
  await fs.writeFile(
    path.join(dataDir, "server-state.json"),
    JSON.stringify(serverState, null, 2)
  );

  // Generate menu-items.json (mirrors /api/menu-items endpoint)
  const evalsWithPrevEvals = await Promise.all(
    suites.map(async (e) => ({
      ...e,
      prevEval: await getPreviousCompletedSuite(storage, e.name, e.created_at),
    }))
  );

  const menuItems = evalsWithPrevEvals
    .map((e) => {
      const evals = allEvals.filter((e) => e.suite_id === e.id);
      const evalScores = allScores.filter((s) =>
        evals.some((e) => e.id === s.eval_id)
      );
      const score =
        evalScores.length > 0
          ? evalScores.reduce((sum, s) => sum + s.score, 0) / evalScores.length
          : 0;

      const prevSuiteEvals = e.prevEval
        ? allEvals.filter((r) => r.suite_id === e.prevEval!.id)
        : [];
      const prevSuiteScores = allScores.filter((s) =>
        prevSuiteEvals.some((r) => r.id === s.eval_id)
      );
      const prevScore = e.prevEval
        ? prevSuiteScores.length > 0
          ? prevSuiteScores.reduce((sum, s) => sum + s.score, 0) /
            prevSuiteScores.length
          : 0
        : undefined;

      const hasScores = evalScores.length > 0;

      return {
        filepath: e.filepath,
        name: e.name,
        score,
        prevScore,
        suiteStatus: e.status,
        variantName: e.variant_name,
        variantGroup: e.variant_group,
        hasScores,
      } satisfies Evalite.SDK.GetMenuItemsResultSuite;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const menuItemsData: Evalite.SDK.GetMenuItemsResult = {
    suites: menuItems,
    score: average(menuItems, (e) => e.score),
    prevScore: average(menuItems, (e) => e.prevScore ?? e.score),
    runStatus: menuItems.some((e) => e.suiteStatus === "fail")
      ? "fail"
      : "success",
  };

  await fs.writeFile(
    path.join(dataDir, "menu-items.json"),
    JSON.stringify(menuItemsData, null, 2)
  );

  // Generate per-eval JSON files (mirrors /api/eval endpoint)
  const availableEvals: string[] = [];

  for (const evaluation of suites) {
    const sanitizedName = sanitizeFilename(evaluation.name);
    availableEvals.push(sanitizedName);

    const prevEvaluation = await getPreviousCompletedSuite(
      storage,
      evaluation.name,
      evaluation.created_at
    );

    const evals = await storage.evals.getMany({
      suiteIds: [evaluation.id, prevEvaluation?.id].filter(
        (i) => typeof i === "number"
      ),
    });

    const scores = await storage.scores.getMany({
      evalIds: evals.map((r) => r.id),
    });

    const history = await getHistoricalEvalsWithScoresByName(
      storage,
      evaluation.name
    );

    const evalData: Evalite.SDK.GetSuiteByNameResult = {
      history: history.map((h) => ({
        score: h.average_score,
        date: h.created_at,
      })),
      suite: {
        ...evaluation,
        evals: evals
          .filter((r) => r.suite_id === evaluation.id)
          .map((r) => ({
            ...r,
            input: transformEvaliteFilePaths(r.input, getUniqueFilename),
            output: transformEvaliteFilePaths(r.output, getUniqueFilename),
            expected: transformEvaliteFilePaths(r.expected, getUniqueFilename),
            rendered_columns: transformEvaliteFilePaths(
              r.rendered_columns,
              getUniqueFilename
            ),
            scores: scores.filter((s) => s.eval_id === r.id),
          })),
      },
      prevSuite: prevEvaluation
        ? {
            ...prevEvaluation,
            evals: evals
              .filter((r) => r.suite_id === prevEvaluation.id)
              .map((r) => ({
                ...r,
                input: transformEvaliteFilePaths(r.input, getUniqueFilename),
                output: transformEvaliteFilePaths(r.output, getUniqueFilename),
                expected: transformEvaliteFilePaths(
                  r.expected,
                  getUniqueFilename
                ),
                rendered_columns: transformEvaliteFilePaths(
                  r.rendered_columns,
                  getUniqueFilename
                ),
                scores: scores.filter((s) => s.eval_id === r.id),
              })),
          }
        : undefined,
    };

    await fs.writeFile(
      path.join(dataDir, `suite-${sanitizedName}.json`),
      JSON.stringify(evalData, null, 2)
    );

    // Generate per-result JSON files (mirrors /api/eval/result endpoint)
    const evalsForSuite = allEvals.filter((r) => r.suite_id === evaluation.id);

    for (let index = 0; index < evalsForSuite.length; index++) {
      const thisEval = evalsForSuite[index]!;

      const prevEval = allEvals.filter(
        (e) => e.suite_id === prevEvaluation?.id
      );

      const _eval: Evalite.SDK.GetEvalResult["eval"] = {
        ...thisEval,
        input: transformEvaliteFilePaths(thisEval.input, getUniqueFilename),
        output: transformEvaliteFilePaths(thisEval.output, getUniqueFilename),
        expected: transformEvaliteFilePaths(
          thisEval.expected,
          getUniqueFilename
        ),
        rendered_columns: transformEvaliteFilePaths(
          thisEval.rendered_columns,
          getUniqueFilename
        ),
        score:
          averageScores.find((s) => s.eval_id === thisEval.id)?.average ?? 0,
        scores: allScores.filter((s) => s.eval_id === thisEval.id),
        traces: allTraces
          .filter((t) => t.eval_id === thisEval.id)
          .map((t) => ({
            ...t,
            input: transformEvaliteFilePaths(t.input, getUniqueFilename),
            output: transformEvaliteFilePaths(t.output, getUniqueFilename),
          })),
      };

      const prevEvalInDb = prevEval[index];

      const resolvedPrevEval: Evalite.SDK.GetEvalResult["prevEval"] =
        prevEvalInDb
          ? {
              ...prevEvalInDb,
              input: transformEvaliteFilePaths(
                prevEvalInDb.input,
                getUniqueFilename
              ),
              output: transformEvaliteFilePaths(
                prevEvalInDb.output,
                getUniqueFilename
              ),
              expected: transformEvaliteFilePaths(
                prevEvalInDb.expected,
                getUniqueFilename
              ),
              rendered_columns: transformEvaliteFilePaths(
                prevEvalInDb.rendered_columns,
                getUniqueFilename
              ),
              score:
                averageScores.find((s) => s.eval_id === prevEvalInDb.id)
                  ?.average ?? 0,
              scores: allScores.filter((s) => s.eval_id === prevEvalInDb.id),
            }
          : undefined;

      const evalData: Evalite.SDK.GetEvalResult = {
        eval: _eval,
        prevEval: resolvedPrevEval,
        suite: evaluation,
      };

      await fs.writeFile(
        path.join(dataDir, `eval-${sanitizedName}-${index}.json`),
        JSON.stringify(evalData, null, 2)
      );
    }

    console.log(`  ✓ ${evaluation.name} (${evalsForSuite.length} results)`);
  }

  // Copy all referenced files to output
  if (filePathMapper.size > 0) {
    console.log(`Copying ${filePathMapper.size} files...`);
    for (const [originalPath, uniqueFilename] of filePathMapper.entries()) {
      const destPath = path.join(filesDir, uniqueFilename);
      try {
        await fs.copyFile(originalPath, destPath);
      } catch (error) {
        console.warn(`Warning: Failed to copy file ${originalPath}: ${error}`);
      }
    }
    console.log(`  ✓ Copied ${filePathMapper.size} files`);
  } else {
    console.log("No files to copy");
  }

  // Copy UI assets
  console.log("Copying UI assets...");
  const uiRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "ui");
  await copyDirectory(uiRoot, outputPath, ["index.html"]);

  // Modify and copy index.html
  const indexHtmlPath = path.join(uiRoot, "index.html");
  let indexHtml = await fs.readFile(indexHtmlPath, "utf-8");

  // Change absolute paths to relative
  indexHtml = indexHtml.replace(/\/assets\//g, "/assets/");

  // Add static mode configuration
  const staticConfig = `
    <script>
      window.__EVALITE_STATIC_DATA__ = {
        staticMode: true,
        availableEvals: ${JSON.stringify(availableEvals)}
      };
    </script>
  </head>`;

  indexHtml = indexHtml.replace("</head>", staticConfig);

  await fs.writeFile(path.join(outputPath, "index.html"), indexHtml);

  console.log(`\n✓ Export complete: ${outputPath}`);
  console.log(`  Run: ${run.id} (${run.runType})`);
  console.log(`  Evals: ${suites.length}`);
  console.log(`  Results: ${allEvals.length}`);
  console.log(
    `\nTo view: npx serve ${outputPath} or open index.html in a browser`
  );
};

/**
 * Recursively copies a directory
 */
const copyDirectory = async (
  src: string,
  dest: string,
  excludeFiles: string[] = []
): Promise<void> => {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    if (excludeFiles.includes(entry.name)) {
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, excludeFiles);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
};

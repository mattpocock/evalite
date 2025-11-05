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
 * Get the previous completed eval by name and created_at time
 */
const getPreviousCompletedEval = async (
  storage: Evalite.Storage,
  name: string,
  createdAt: string
): Promise<Evalite.Storage.Entities.Eval | undefined> => {
  const evals = await storage.evals.getMany({
    name,
    createdBefore: createdAt,
    statuses: ["success", "fail"],
    limit: 1,
    orderBy: "created_at",
    orderDirection: "desc",
  });
  return evals[0];
};

/**
 * Get historical evals with average scores by name
 */
const getHistoricalEvalsWithScoresByName = async (
  storage: Evalite.Storage,
  name: string
): Promise<(Evalite.Storage.Entities.Eval & { average_score: number })[]> => {
  const evals = await storage.evals.getMany({
    name,
    statuses: ["success", "fail"],
    orderBy: "created_at",
    orderDirection: "asc",
  });

  // Get results and scores for all evals
  const allResults = await storage.results.getMany({
    evalIds: evals.map((e) => e.id),
  });
  const allScores = await storage.scores.getMany({
    resultIds: allResults.map((r) => r.id),
  });

  // Calculate average scores for each eval
  return evals.map((evaluation) => {
    const evalResults = allResults.filter((r) => r.eval_id === evaluation.id);
    const evalScores = allScores.filter((s) =>
      evalResults.some((r) => r.id === s.result_id)
    );
    const average_score =
      evalScores.length > 0
        ? evalScores.reduce((sum, s) => sum + s.score, 0) / evalScores.length
        : 0;
    return { ...evaluation, average_score };
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
 * Normalizes a base path for URL routing
 * - Requires leading slash (throws if missing)
 * - Removes trailing slash (unless root "/")
 */
const normalizeBasePath = (basePath: string): string => {
  if (!basePath) {
    return "/";
  }

  // Require leading slash
  if (!basePath.startsWith("/")) {
    throw new Error(`basePath must start with "/". Got: ${basePath}`);
  }

  // Remove trailing slash unless it's the root
  if (basePath !== "/" && basePath.endsWith("/")) {
    return basePath.slice(0, -1);
  }

  return basePath;
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
  /** Optional base path for hosting at non-root URLs (defaults to "/") */
  basePath?: string;
}

/**
 * Exports the Evalite UI as a static bundle with pre-computed JSON files
 */
export const exportStaticUI = async (
  options: ExportStaticOptions
): Promise<void> => {
  const { storage, outputPath, runId, basePath: rawBasePath = "/" } = options;

  // Normalize basePath: ensure leading slash, remove trailing slash (unless root)
  const basePath = normalizeBasePath(rawBasePath);

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
  const evals = await storage.evals.getMany({
    runIds: [run.id],
    statuses: ["success", "fail"],
  });
  console.log(`Found ${evals.length} evaluations`);

  const allResults = await storage.results.getMany({
    evalIds: evals.map((e) => e.id),
  });
  const allScores = await storage.scores.getMany({
    resultIds: allResults.map((r) => r.id),
  });
  const allTraces = await storage.traces.getMany({
    resultIds: allResults.map((r) => r.id),
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
    evals.map(async (e) => ({
      ...e,
      prevEval: await getPreviousCompletedEval(storage, e.name, e.created_at),
    }))
  );

  const menuItems = evalsWithPrevEvals
    .map((e) => {
      const evalResults = allResults.filter((r) => r.eval_id === e.id);
      const evalScores = allScores.filter((s) =>
        evalResults.some((r) => r.id === s.result_id)
      );
      const score =
        evalScores.length > 0
          ? evalScores.reduce((sum, s) => sum + s.score, 0) / evalScores.length
          : 0;

      const prevEvalResults = e.prevEval
        ? allResults.filter((r) => r.eval_id === e.prevEval!.id)
        : [];
      const prevEvalScores = allScores.filter((s) =>
        prevEvalResults.some((r) => r.id === s.result_id)
      );
      const prevScore = e.prevEval
        ? prevEvalScores.length > 0
          ? prevEvalScores.reduce((sum, s) => sum + s.score, 0) /
            prevEvalScores.length
          : 0
        : undefined;

      const hasScores = evalScores.length > 0;

      return {
        filepath: e.filepath,
        name: e.name,
        score,
        prevScore,
        evalStatus: e.status,
        variantName: e.variant_name,
        variantGroup: e.variant_group,
        hasScores,
      } satisfies Evalite.SDK.GetMenuItemsResultEval;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const menuItemsData: Evalite.SDK.GetMenuItemsResult = {
    evals: menuItems,
    score: average(menuItems, (e) => e.score),
    prevScore: average(menuItems, (e) => e.prevScore ?? e.score),
    evalStatus: menuItems.some((e) => e.evalStatus === "fail")
      ? "fail"
      : "success",
  };

  await fs.writeFile(
    path.join(dataDir, "menu-items.json"),
    JSON.stringify(menuItemsData, null, 2)
  );

  // Generate per-eval JSON files (mirrors /api/eval endpoint)
  const availableEvals: string[] = [];

  for (const evaluation of evals) {
    const sanitizedName = sanitizeFilename(evaluation.name);
    availableEvals.push(sanitizedName);

    const prevEvaluation = await getPreviousCompletedEval(
      storage,
      evaluation.name,
      evaluation.created_at
    );

    const results = await storage.results.getMany({
      evalIds: [evaluation.id, prevEvaluation?.id].filter(
        (i) => typeof i === "number"
      ),
    });

    const scores = await storage.scores.getMany({
      resultIds: results.map((r) => r.id),
    });

    const history = await getHistoricalEvalsWithScoresByName(
      storage,
      evaluation.name
    );

    const evalData: Evalite.SDK.GetEvalByNameResult = {
      history: history.map((h) => ({
        score: h.average_score,
        date: h.created_at,
      })),
      evaluation: {
        ...evaluation,
        results: results
          .filter((r) => r.eval_id === evaluation.id)
          .map((r) => ({
            ...r,
            input: transformEvaliteFilePaths(r.input, getUniqueFilename),
            output: transformEvaliteFilePaths(r.output, getUniqueFilename),
            expected: transformEvaliteFilePaths(r.expected, getUniqueFilename),
            rendered_columns: transformEvaliteFilePaths(
              r.rendered_columns,
              getUniqueFilename
            ),
            scores: scores.filter((s) => s.result_id === r.id),
          })),
      },
      prevEvaluation: prevEvaluation
        ? {
            ...prevEvaluation,
            results: results
              .filter((r) => r.eval_id === prevEvaluation.id)
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
                scores: scores.filter((s) => s.result_id === r.id),
              })),
          }
        : undefined,
    };

    await fs.writeFile(
      path.join(dataDir, `eval-${sanitizedName}.json`),
      JSON.stringify(evalData, null, 2)
    );

    // Generate per-result JSON files (mirrors /api/eval/result endpoint)
    const evalResults = allResults.filter((r) => r.eval_id === evaluation.id);

    for (let index = 0; index < evalResults.length; index++) {
      const thisResult = evalResults[index]!;

      const prevEvaluationResults = allResults.filter(
        (r) => r.eval_id === prevEvaluation?.id
      );

      const result: Evalite.SDK.GetResultResult["result"] = {
        ...thisResult,
        input: transformEvaliteFilePaths(thisResult.input, getUniqueFilename),
        output: transformEvaliteFilePaths(thisResult.output, getUniqueFilename),
        expected: transformEvaliteFilePaths(
          thisResult.expected,
          getUniqueFilename
        ),
        rendered_columns: transformEvaliteFilePaths(
          thisResult.rendered_columns,
          getUniqueFilename
        ),
        score:
          averageScores.find((s) => s.result_id === thisResult.id)?.average ??
          0,
        scores: allScores.filter((s) => s.result_id === thisResult.id),
        traces: allTraces
          .filter((t) => t.result_id === thisResult.id)
          .map((t) => ({
            ...t,
            input: transformEvaliteFilePaths(t.input, getUniqueFilename),
            output: transformEvaliteFilePaths(t.output, getUniqueFilename),
          })),
      };

      const prevResultInDb = prevEvaluationResults[index];

      const prevResult: Evalite.SDK.GetResultResult["prevResult"] =
        prevResultInDb
          ? {
              ...prevResultInDb,
              input: transformEvaliteFilePaths(
                prevResultInDb.input,
                getUniqueFilename
              ),
              output: transformEvaliteFilePaths(
                prevResultInDb.output,
                getUniqueFilename
              ),
              expected: transformEvaliteFilePaths(
                prevResultInDb.expected,
                getUniqueFilename
              ),
              rendered_columns: transformEvaliteFilePaths(
                prevResultInDb.rendered_columns,
                getUniqueFilename
              ),
              score:
                averageScores.find((s) => s.result_id === prevResultInDb.id)
                  ?.average ?? 0,
              scores: allScores.filter(
                (s) => s.result_id === prevResultInDb.id
              ),
            }
          : undefined;

      const resultData: Evalite.SDK.GetResultResult = {
        result,
        prevResult,
        evaluation,
      };

      await fs.writeFile(
        path.join(dataDir, `result-${sanitizedName}-${index}.json`),
        JSON.stringify(resultData, null, 2)
      );
    }

    console.log(`  ✓ ${evaluation.name} (${evalResults.length} results)`);
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

  // Replace absolute paths with basePath-prefixed paths
  const pathPrefix = basePath === "/" ? "" : basePath;
  indexHtml = indexHtml.replace(
    /href="\/favicon\.ico"/g,
    `href="${pathPrefix}/favicon.ico"`
  );
  indexHtml = indexHtml.replace(
    /href="\/favicon\.svg"/g,
    `href="${pathPrefix}/favicon.svg"`
  );
  indexHtml = indexHtml.replace(
    /src="\/assets\//g,
    `src="${pathPrefix}/assets/`
  );
  indexHtml = indexHtml.replace(
    /href="\/assets\//g,
    `href="${pathPrefix}/assets/`
  );

  // Add static mode configuration
  const staticConfig = `
    <script>
      window.__EVALITE_STATIC_DATA__ = {
        staticMode: true,
        basePath: ${JSON.stringify(basePath)},
        availableEvals: ${JSON.stringify(availableEvals)}
      };
    </script>
  </head>`;

  indexHtml = indexHtml.replace("</head>", staticConfig);

  await fs.writeFile(path.join(outputPath, "index.html"), indexHtml);

  console.log(`\n✓ Export complete: ${outputPath}`);
  console.log(`  Run: ${run.id} (${run.runType})`);
  console.log(`  Evals: ${evals.length}`);
  console.log(`  Results: ${allResults.length}`);
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

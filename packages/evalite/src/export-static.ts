import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  createDatabase,
  getAverageScoresFromResults,
  getEvals,
  getEvalsAverageScores,
  getHistoricalEvalsWithScoresByName,
  getMostRecentRun,
  getPreviousCompletedEval,
  getResults,
  getScores,
  getTraces,
  type Db,
} from "./db.js";
import type { Evalite } from "./types.js";
import { average, EvaliteFile } from "./utils.js";
import { DB_LOCATION } from "./backend-only-constants.js";

/**
 * Sanitizes an eval name for use in filenames
 */
const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
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
  /** Working directory where evalite.db is located */
  cwd: string;
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
  const { cwd, outputPath, runId } = options;

  // Open database
  const dbPath = path.join(cwd, DB_LOCATION);

  // Check if database exists
  try {
    await fs.access(dbPath);
  } catch {
    throw new Error(
      `Database not found at ${dbPath}. Please run evaluations first.`
    );
  }

  const db = createDatabase(dbPath);

  try {
    // Get the run to export
    const run = runId
      ? db
          .prepare<{ id: number }, Db.Run>(`SELECT * FROM runs WHERE id = @id`)
          .get({ id: runId })
      : getMostRecentRun(db, "full");

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
    const evals = getEvals(db, [run.id], ["success", "fail"]);
    console.log(`Found ${evals.length} evaluations`);

    const allResults = getResults(
      db,
      evals.map((e) => e.id)
    );
    const allScores = getScores(
      db,
      allResults.map((r) => r.id)
    );
    const allTraces = getTraces(
      db,
      allResults.map((r) => r.id)
    );
    const averageScores = getAverageScoresFromResults(
      db,
      allResults.map((r) => r.id)
    );

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
    const evalsWithPrevEvals = evals.map((e) => ({
      ...e,
      prevEval: getPreviousCompletedEval(db, e.name, e.created_at),
    }));

    const evalsAverageScores = getEvalsAverageScores(
      db,
      evalsWithPrevEvals.flatMap((e) => {
        if (e.prevEval) {
          return [e.id, e.prevEval.id];
        }
        return [e.id];
      })
    );

    const menuItems = evalsWithPrevEvals
      .map((e) => {
        const score =
          evalsAverageScores.find((s) => s.eval_id === e.id)?.average ?? 0;
        const prevScore = evalsAverageScores.find(
          (s) => s.eval_id === e.prevEval?.id
        )?.average;

        const evalResults = allResults.filter((r) => r.eval_id === e.id);
        const evalScores = allScores.filter((s) =>
          evalResults.some((r) => r.id === s.result_id)
        );
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

      const prevEvaluation = getPreviousCompletedEval(
        db,
        evaluation.name,
        evaluation.created_at
      );

      const results = getResults(
        db,
        [evaluation.id, prevEvaluation?.id].filter((i) => typeof i === "number")
      );

      const scores = getScores(
        db,
        results.map((r) => r.id)
      );

      const history = getHistoricalEvalsWithScoresByName(db, evaluation.name);

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
        },
        prevEvaluation: prevEvaluation
          ? {
              ...prevEvaluation,
              results: results
                .filter((r) => r.eval_id === prevEvaluation.id)
                .map((r) => ({
                  ...r,
                  input: transformEvaliteFilePaths(r.input, getUniqueFilename),
                  output: transformEvaliteFilePaths(
                    r.output,
                    getUniqueFilename
                  ),
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
          output: transformEvaliteFilePaths(
            thisResult.output,
            getUniqueFilename
          ),
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
          console.warn(
            `Warning: Failed to copy file ${originalPath}: ${error}`
          );
        }
      }
      console.log(`  ✓ Copied ${filePathMapper.size} files`);
    } else {
      console.log("No files to copy");
    }

    // Copy UI assets
    console.log("Copying UI assets...");
    const uiRoot = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "ui"
    );
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
    console.log(`  Evals: ${evals.length}`);
    console.log(`  Results: ${allResults.length}`);
    console.log(
      `\nTo view: npx serve ${outputPath} or open index.html in a browser`
    );
  } finally {
    db.close();
  }
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

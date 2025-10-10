import { table } from "table";
import c from "tinyrainbow";
import { inspect } from "util";
import type { Evalite } from "../types.js";
import { average, EvaliteFile } from "../utils.js";

// Local type definitions (independent of Vitest)
export interface EvalCase {
  meta: {
    evalite?: {
      result?: Evalite.Result;
    };
  };
  result?: {
    state?: "fail" | "pass" | "run";
  };
}

export interface TaskNode {
  filepath?: string;
  name: string;
  tasks: TaskNode[];
  result?: {
    state?: "fail" | "pass" | "run" | "skip" | "only" | "todo";
    duration?: number;
  };
}

export interface EvalFileResult extends TaskNode {
  collectDuration?: number;
  setupDuration?: number;
}

function extractEvalCases(files: EvalFileResult[]): EvalCase[] {
  const cases: EvalCase[] = [];

  function traverse(task: TaskNode) {
    if (task.tasks && task.tasks.length > 0) {
      task.tasks.forEach(traverse);
    } else {
      cases.push(task as any);
    }
  }

  files.forEach(traverse);
  return cases;
}

export function withLabel(
  color: "red" | "green" | "blue" | "cyan",
  label: string,
  message: string
) {
  return `${c.bold(c.inverse(c[color](` ${label} `)))} ${c[color](message)}`;
}

export const renderers = {
  title: () => {
    return c.magenta(c.bold("EVALITE"));
  },
  description: (opts: { isWatching: boolean; port: number }) => {
    if (opts.isWatching) {
      return [
        c.dim("running on "),
        c.cyan(`http://localhost:${c.bold(opts.port)}/`),
      ].join("");
    }

    return c.dim("running...");
  },
};

const BADGE_PADDING = "       ";

export function renderInitMessage(
  logger: { log: (msg: string) => void },
  opts: { isWatching: boolean; port: number }
) {
  logger.log("");
  logger.log(` ${renderers.title()} ${renderers.description(opts)}`);
  logger.log("");
}

export function renderWatcherStart(
  logger: { log: (msg: string) => void },
  opts: {
    hasErrors: boolean;
    failedDueToThreshold: boolean;
    scoreThreshold: number | undefined;
  }
) {
  logger.log("");

  if (opts.hasErrors) {
    logger.log(
      withLabel(
        "red",
        "FAIL",
        "Errors detected in evals. Watching for file changes..."
      )
    );
  } else if (opts.failedDueToThreshold) {
    logger.log(
      withLabel(
        "red",
        "FAIL",
        `${opts.scoreThreshold}% threshold not met. Watching for file changes...`
      )
    );
  } else {
    logger.log(withLabel("green", "PASS", "Waiting for file changes..."));
  }

  const hints = [
    c.dim("press ") + c.bold("h") + c.dim(" to show help"),
    c.dim("press ") + c.bold("q") + c.dim(" to quit"),
  ];

  logger.log(BADGE_PADDING + hints.join(c.dim(", ")));
}

export function displayScore(_score: number) {
  const score = Number.isNaN(_score) ? 0 : _score;
  const percentageScore = Math.round(score * 100);
  if (percentageScore >= 80) {
    return c.bold(c.green(percentageScore + "%"));
  } else if (percentageScore >= 50) {
    return c.bold(c.yellow(percentageScore + "%"));
  } else {
    return c.bold(c.red(percentageScore + "%"));
  }
}

export function renderMaybeEvaliteFile(input: unknown) {
  if (EvaliteFile.isEvaliteFile(input)) {
    return input.path;
  }

  return input;
}

export function getScoreFromTests(tests: EvalCase[]) {
  const scores = tests.flatMap(
    (test) => test.meta.evalite?.result?.scores.map((s) => s.score ?? 0) || []
  );

  const averageScore = average(scores, (score) => score ?? 0);

  return averageScore;
}

export function renderTable(
  logger: { log: (msg: string) => void },
  rows: {
    columns: {
      label: string;
      value: unknown;
    }[];
    score: number;
  }[]
) {
  logger.log("");

  const availableColumns = process.stdout.columns || 80;

  const scoreWidth = 5;
  const columnsWritableWidth = 11;
  const availableInnerSpace =
    availableColumns - columnsWritableWidth - scoreWidth;

  const columns = rows[0]?.columns;

  if (!columns) {
    return;
  }

  const colWidth = Math.min(
    Math.floor(availableInnerSpace / columns.length),
    80
  );

  logger.log(
    table(
      [
        [
          ...columns.map((col) => c.cyan(c.bold(col.label))),
          c.cyan(c.bold("Score")),
        ],
        ...rows.map((row) => [
          ...row.columns.map((col) => {
            return typeof col.value === "object"
              ? inspect(col.value, {
                  colors: true,
                  depth: null,
                  breakLength: colWidth,
                  numericSeparator: true,
                  compact: true,
                })
              : col.value;
          }),
          displayScore(row.score),
        ]),
      ],
      {
        columns: [
          ...columns.map((col) => ({
            width: colWidth,
            wrapWord: typeof col.value === "string",
            truncate: 200,
            paddingLeft: 1,
            paddingRight: 1,
          })),
          { width: scoreWidth },
        ],
      }
    )
  );
}

export interface TestSummaryData {
  tests: EvalCase[];
  totalDuration: number;
  failedTasks: EvalFileResult[];
  averageScore: number;
  totalFiles: number;
  files: EvalFileResult[];
}

export function computeTestSummaryData(
  files: EvalFileResult[]
): TestSummaryData {
  const tests = extractEvalCases(files);

  const collectTime = files.reduce((a, b) => a + (b.collectDuration || 0), 0);
  const testsTime = files.reduce((a, b) => a + (b.result?.duration || 0), 0);
  const setupTime = files.reduce((a, b) => a + (b.setupDuration || 0), 0);

  const totalDuration = collectTime + testsTime + setupTime;

  const failedTasks = files.filter((file) => {
    return file.tasks.some((task) => task.result?.state === "fail");
  });

  const averageScore = getScoreFromTests(tests);

  const totalFiles = new Set(files.map((f) => f.filepath)).size;

  return {
    tests,
    totalDuration,
    failedTasks,
    averageScore,
    totalFiles,
    files,
  };
}

export function renderScoreDisplay(
  logger: { log: (msg: string) => void },
  failedTasksCount: number,
  averageScore: number
) {
  const scoreDisplay =
    failedTasksCount > 0
      ? c.red("✖ ") + c.dim(`(${failedTasksCount} failed)`)
      : displayScore(averageScore);

  logger.log(["      ", c.dim("Score"), "  ", scoreDisplay].join(""));
}

export function renderThreshold(
  logger: { log: (msg: string) => void },
  scoreThreshold: number,
  averageScore: number
): "passed" | "failed" {
  let thresholdScoreSuffix = "";
  let result: "passed" | "failed";

  if (averageScore * 100 < scoreThreshold) {
    thresholdScoreSuffix = `${c.dim(` (failed)`)}`;
    result = "failed";
  } else {
    thresholdScoreSuffix = `${c.dim(` (passed)`)}`;
    result = "passed";
  }

  logger.log(
    [
      "  ",
      c.dim("Threshold"),
      "  ",
      c.bold(scoreThreshold + "%"),
      thresholdScoreSuffix,
    ].join("")
  );

  return result;
}

export function renderSummaryStats(
  logger: { log: (msg: string) => void },
  data: TestSummaryData
) {
  logger.log([" ", c.dim("Eval Files"), "  ", data.files.length].join(""));

  logger.log(
    [
      "      ",
      c.dim("Evals"),
      "  ",
      data.files.reduce((a, b) => a + b.tasks.length, 0),
    ].join("")
  );

  logger.log(
    [
      "   ",
      c.dim("Duration"),
      "  ",
      `${Math.round(data.totalDuration)}ms`,
    ].join("")
  );
}

export function renderDetailedTable(
  logger: { log: (msg: string) => void },
  tests: EvalCase[]
) {
  renderTable(
    logger,
    tests
      .filter((t) => typeof t.meta.evalite?.result === "object")
      .map((t) => t.meta.evalite!.result!)
      .map((result) => ({
        columns:
          result.renderedColumns.length > 0
            ? result.renderedColumns.map((col) => ({
                label: col.label,
                value: renderMaybeEvaliteFile(col.value),
              }))
            : [
                {
                  label: "Input",
                  value: renderMaybeEvaliteFile(result.input),
                },
                {
                  label: "Output",
                  value: renderMaybeEvaliteFile(result.output),
                },
              ],
        score: average(result.scores, (s) => s.score ?? 0),
      }))
  );
}

export function renderTask(
  logger: { log: (msg: string) => void },
  file: TaskNode
): boolean {
  // Tasks can be files or individual tests
  if (
    !("filepath" in file) ||
    !file.result?.state ||
    file.result?.state === "run"
  ) {
    return false;
  }

  const tests = extractEvalCases([file]);

  const hasNoEvalite = tests.every((t) => !t.meta.evalite);

  if (hasNoEvalite) {
    return false;
  }

  const scores: number[] = [];
  const failed = tests.some((t) => t.result?.state === "fail");

  for (const { meta } of tests) {
    if (meta.evalite?.result) {
      scores.push(...meta.evalite!.result.scores.map((s) => s.score ?? 0));
    }
  }

  const totalScore = scores.reduce((a, b) => a + b, 0);
  const averageScore = totalScore / scores.length;

  const title = failed ? c.red("✖") : displayScore(averageScore);

  const toLog = [
    ` ${title} `,
    `${file.name}  `,
    c.dim(`(${file.tasks.length} ${file.tasks.length > 1 ? "evals" : "eval"})`),
  ];

  logger.log(toLog.join(""));

  return true;
}

import { table } from "table";
import c from "tinyrainbow";
import { inspect } from "util";
import type { Evalite } from "../types.js";
import { average, EvaliteFile } from "../utils.js";

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

export function displayScore(_score: number | null) {
  if (_score === null) {
    return c.dim("-");
  }
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

export function renderTable(
  logger: { log: (msg: string) => void },
  rows: {
    columns: {
      label: string;
      value: unknown;
    }[];
    score: number | null;
  }[]
) {
  logger.log("");

  const availableColumns = process.stdout.columns || 80;

  const hasScores = rows.some((row) => row.score !== null);

  const scoreWidth = hasScores ? 5 : 0;
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
          ...(hasScores ? [c.cyan(c.bold("Score"))] : []),
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
          ...(hasScores ? [displayScore(row.score)] : []),
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
          ...(hasScores ? [{ width: scoreWidth }] : []),
        ],
      }
    )
  );
}

export function renderScoreDisplay(
  logger: { log: (msg: string) => void },
  failedTasksCount: number,
  averageScore: number | null
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
  averageScore: number | null
): "passed" | "failed" {
  let thresholdScoreSuffix = "";
  let result: "passed" | "failed";

  if (averageScore === null || averageScore * 100 < scoreThreshold) {
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
  data: {
    totalFiles: number;
    maxDuration: number;
    totalEvals: number;
  }
) {
  logger.log([" ", c.dim("Eval Files"), "  ", data.totalFiles].join(""));

  logger.log(["      ", c.dim("Evals"), "  ", data.totalEvals].join(""));

  logger.log(
    ["   ", c.dim("Duration"), "  ", `${Math.round(data.maxDuration)}ms`].join(
      ""
    )
  );
}

export function renderDetailedTable(
  logger: { log: (msg: string) => void },
  results: Evalite.Result[]
) {
  renderTable(
    logger,
    results.map((result) => ({
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
      score:
        result.scores.length === 0
          ? null
          : average(result.scores, (s) => s.score ?? 0),
    }))
  );
}

export function renderTask(opts: {
  logger: { log: (msg: string) => void };
  result: {
    filePath: string;
    status: Evalite.ResultStatus;
    scores: Evalite.Score[];
    numberOfEvals: number;
  };
}) {
  const scores = opts.result.scores.map((s) => s.score ?? 0);

  const totalScore = scores.reduce((a, b) => a + b, 0);
  const averageScore = scores.length === 0 ? null : totalScore / scores.length;

  const prefix =
    opts.result.status === "fail"
      ? c.red("✖")
      : opts.result.status === "running"
        ? c.yellow("⏳")
        : displayScore(averageScore);

  const text =
    opts.result.status === "running"
      ? c.dim(opts.result.filePath)
      : opts.result.filePath;

  const toLog = [
    ` ${prefix} `,
    `${text}  `,
    c.dim(
      opts.result.numberOfEvals === 1
        ? `(${opts.result.numberOfEvals} eval)`
        : `(${opts.result.numberOfEvals} evals)`
    ),
  ];

  opts.logger.log(toLog.join(""));
}

export function renderServeModeFinalMessage(
  logger: { log: (msg: string) => void },
  port: number
) {
  logger.log("");
  logger.log(
    withLabel(
      "blue",
      "INFO",
      "Tests won't re-run on file changes. Re-run evalite serve to try again."
    )
  );
  logger.log(
    BADGE_PADDING +
      c.dim("Dev server available at ") +
      c.cyan(`http://localhost:${c.bold(port)}/`)
  );
}

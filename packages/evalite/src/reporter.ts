import type { RunnerTask, RunnerTestFile, TaskResultPack } from "vitest";
import { BasicReporter } from "vitest/reporters";

import { appendEvalsToJsonDb, type Evalite } from "@evalite/core";
import { table } from "table";
import c from "tinyrainbow";
import { average, sum } from "./utils.js";

export interface EvaliteReporterOptions {
  jsonDbLocation: string;
  isWatching: boolean;
  port: number;
  logEvent: (event: Evalite.WebsocketEvent) => void;
}

const renderers = {
  title: () => {
    return c.magenta(c.bold("EVALITE"));
  },
  description: (opts: EvaliteReporterOptions) => {
    if (opts.isWatching) {
      return [
        c.dim("running on "),
        c.cyan(`http://localhost:${c.bold(opts.port)}/`),
      ].join("");
    }

    return c.dim("running...");
  },
};

export default class EvaliteReporter extends BasicReporter {
  private opts: EvaliteReporterOptions;

  // private server: Server;
  constructor(opts: EvaliteReporterOptions) {
    super();
    this.opts = opts;
  }
  override onInit(ctx: any): void {
    this.ctx = ctx;
    this.start = performance.now();

    this.ctx.logger.log("");
    this.ctx.logger.log(
      ` ${renderers.title()} ${renderers.description(this.opts)}`
    );
    this.ctx.logger.log("");

    this.opts.logEvent({
      type: "RUN_IN_PROGRESS",
      filepaths: this.ctx.state.getFiles().map((f) => f.filepath),
      runType: "full",
    });
  }

  // override onTaskUpdate(packs: TaskResultPack[]): void {
  //   this.opts.logEvent({
  //     type: "RUN_IN_PROGRESS",
  //   });
  //   super.onTaskUpdate(packs);
  // }

  override onWatcherStart(files?: RunnerTestFile[], errors?: unknown[]): void {
    super.onWatcherStart(files, errors);
  }

  override onWatcherRerun(files: string[], trigger?: string): void {
    this.opts.logEvent({
      type: "RUN_IN_PROGRESS",
      filepaths: files,
      runType: "partial",
    });
    super.onWatcherRerun(files, trigger);
  }

  override onFinished = async (
    files = this.ctx.state.getFiles(),
    errors = this.ctx.state.getUnhandledErrors()
  ) => {
    this.opts.logEvent({
      type: "RUN_COMPLETE",
    });

    await appendEvalsToJsonDb({
      dbLocation: this.opts.jsonDbLocation,
      files,
    });

    super.onFinished(files, errors);
  };

  protected override printTask(task: RunnerTask): void {
    // Tasks can be files or individual tests, and
    // this ensures we only print files
    if (
      !("filepath" in task) ||
      !task.result?.state ||
      task.result?.state === "run"
    ) {
      return;
    }

    const hasNoEvalite = task.tasks.every((t) => !t.meta.evalite);

    if (hasNoEvalite) {
      return super.printTask(task);
    }

    const scores: number[] = [];

    const failed = task.tasks.some((t) => t.result?.state === "fail");

    for (const { meta } of task.tasks) {
      if (meta.evalite) {
        scores.push(
          ...meta.evalite!.results.flatMap((r) =>
            r.scores.map((s) => s.score ?? 0)
          )
        );
      }
    }

    const totalScore = scores.reduce((a, b) => a + b, 0);
    const averageScore = totalScore / scores.length;

    const title = failed ? c.red("✖") : displayScore(averageScore);

    const toLog = [
      ` ${title} `,
      `${task.name}  `,
      c.dim(
        `(${task.tasks.length} ${task.tasks.length > 1 ? "evals" : "eval"})`
      ),
    ];

    // if (task.result.duration) {
    //   toLog.push(" " + c.dim(`${Math.round(task.result.duration ?? 0)}ms`));
    // }

    this.ctx.logger.log(toLog.join(""));
  }

  override reportTestSummary(files: RunnerTestFile[], errors: unknown[]): void {
    // this.printErrorsSummary(errors); // TODO

    const evals = files.flatMap((file) =>
      file.tasks.filter((task) => task.meta.evalite)
    );

    const scores = evals.flatMap((task) =>
      task.meta.evalite!.results.flatMap((r) => r.scores.map((s) => s.score))
    );

    const totalScore = sum(scores, (score) => score ?? 0);
    const averageScore = totalScore / scores.length;

    const collectTime = files.reduce((a, b) => a + (b.collectDuration || 0), 0);
    const testsTime = files.reduce((a, b) => a + (b.result?.duration || 0), 0);
    const setupTime = files.reduce((a, b) => a + (b.setupDuration || 0), 0);

    const totalDuration = collectTime + testsTime + setupTime;

    const failedTasks = files.filter((file) => {
      return file.tasks.some((task) => task.result?.state === "fail");
    });

    const scoreDisplay =
      failedTasks.length > 0
        ? c.red("✖ ") + c.dim(`(${failedTasks.length} failed)`)
        : displayScore(averageScore);

    this.ctx.logger.log(
      ["      ", c.dim("Score"), "  ", scoreDisplay].join("")
    );

    this.ctx.logger.log(
      [" ", c.dim("Eval Files"), "  ", files.length].join("")
    );

    this.ctx.logger.log(
      [
        "      ",
        c.dim("Evals"),
        "  ",
        files.reduce((a, b) => a + b.tasks.length, 0),
      ].join("")
    );

    this.ctx.logger.log(
      ["   ", c.dim("Duration"), "  ", `${Math.round(totalDuration)}ms`].join(
        ""
      )
    );

    if (evals.length === 1 && evals[0]) {
      this.renderTable(
        evals[0].meta.evalite!.results.map((result) => ({
          input: result.input,
          output: result.output,
          score: average(result.scores, (s) => s.score ?? 0),
        }))
      );
    }
  }

  private renderTable(
    props: {
      input: unknown;
      output: unknown;
      score: number;
    }[]
  ) {
    this.ctx.logger.log("");

    const availableColumns = process.stdout.columns || 80;

    const scoreWidth = 5;
    const columnsWritableWidth = 11;
    const availableInnerSpace =
      availableColumns - columnsWritableWidth - scoreWidth;

    const colWidth = Math.min(Math.floor(availableInnerSpace / 2), 80);

    this.ctx.logger.log(
      table(
        [
          [
            c.cyan(c.bold("Input")),
            c.cyan(c.bold("Output")),
            c.cyan(c.bold("Score")),
          ],
          ...props.map((p) => [p.input, p.output, displayScore(p.score)]),
        ],
        {
          columns: [
            { width: colWidth, wrapWord: true },
            { width: colWidth, wrapWord: true },
            { width: scoreWidth },
          ],
        }
      )
    );
  }
}

const displayScore = (score: number) => {
  const percentageScore = Math.round(score * 100);
  if (percentageScore >= 80) {
    return c.bold(c.green(percentageScore + "%"));
  } else if (percentageScore >= 50) {
    return c.bold(c.yellow(percentageScore + "%"));
  } else {
    return c.bold(c.red(percentageScore + "%"));
  }
};

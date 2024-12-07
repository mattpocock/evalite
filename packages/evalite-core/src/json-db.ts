import { readFile } from "fs/promises";
import { average } from "./utils.js";
import { appendFileSync } from "fs";
import type { Evalite } from "./types.js";

export type JsonDBEvent =
  | {
      type: "PARTIAL_RUN_BEGIN";
      startTime: string;
    }
  | {
      type: "FULL_RUN_BEGIN";
      startTime: string;
    };

export type JsonDBLine = JsonDBEval | JsonDBEvent;

export type JsonDBEval = {
  filepath: string;
  name: string;
  score: number;
  startTime: string;
  duration: number;
  results: JsonDbResult[];
  sourceCodeHash: string;
};

export type JsonDbResult = {
  input: unknown;
  expected: unknown;
  result: unknown;
  scores: Evalite.Score[];
  duration: number;
  score: number;
  traces: Evalite.UserProvidedTrace[];
};

export const reportEventToJsonDb = async (opts: {
  dbLocation: string;
  event: JsonDBEvent;
}) => {
  await appendFileSync(opts.dbLocation, JSON.stringify(opts.event) + "\n", {
    encoding: "utf-8",
  });
};

export const appendEvalsToJsonDb = async (opts: {
  dbLocation: string;
  files: {
    name: string;
    filepath: string;
    tasks: {
      name: string;
      meta: {
        evalite?: Evalite.TaskMeta;
      };
    }[];
  }[];
}) => {
  const datetime = new Date().toISOString();
  const evals: JsonDBEval[] = [];

  for (const file of opts.files) {
    for (const task of file.tasks) {
      const jsonDbTask: JsonDBEval = {
        filepath: file.filepath,
        name: task.name,
        score: average(task.meta.evalite?.results || [], (t) => {
          return average(t.scores, (s) => s.score ?? 0);
        }),
        duration: task.meta.evalite?.duration ?? 0,
        results: [],
        startTime: datetime,
        sourceCodeHash: task.meta.evalite?.sourceCodeHash ?? "",
      };

      if (task.meta.evalite) {
        for (const {
          input,
          output: result,
          scores,
          duration,
          expected,
          traces,
        } of task.meta.evalite.results) {
          jsonDbTask.results.push({
            input,
            result,
            expected,
            scores,
            duration,
            score: average(scores, (s) => s.score ?? 0),
            traces,
          });
        }
      }

      evals.push(jsonDbTask);
    }
  }
};

export type GetJsonDbEvalsResult = Record<string, JsonDBEval[]>;

export const getJsonDbEvals = async (opts: {
  dbLocation: string;
}): Promise<GetJsonDbEvalsResult> => {
  const map: GetJsonDbEvalsResult = {};

  await getRows({
    dbLocation: opts.dbLocation,
    mapper: (row) => {
      const evalName = row.name;

      if (!map[evalName]) {
        map[evalName] = [];
      }

      map[evalName]!.unshift(row);
    },
    shouldStop: () => false,
  });

  return map;
};

export const getLastTwoFullRuns = async (opts: {
  dbLocation: string;
}): Promise<GetJsonDbEvalsResult> => {
  const map: GetJsonDbEvalsResult = {};

  let runs = 0;

  await getRows({
    dbLocation: opts.dbLocation,
    mapper: (row) => {
      const evalName = row.name;

      if (!map[evalName]) {
        map[evalName] = [];
      }

      map[evalName]!.unshift(row);
    },
    shouldStop: (line) => {
      if (!("type" in line)) {
        return false;
      }

      if (line.type === "FULL_RUN_BEGIN") {
        runs++;
      }
      return runs === 2;
    },
  });

  return map;
};

export const getRows = async <T>(opts: {
  dbLocation: string;
  mapper: (row: JsonDBEval) => T;
  shouldStop: (row: JsonDBLine) => boolean;
}): Promise<T[]> => {
  const dbContents = await readFile(opts.dbLocation, { encoding: "utf-8" });

  const evals: T[] = [];

  const lines = dbContents.trim().split("\n").reverse();

  for (const line of lines) {
    if (!line) continue;

    const parsed: JsonDBLine = JSON.parse(line);

    if (opts.shouldStop(parsed)) {
      break;
    }

    if (isJsonDbEval(parsed)) {
      evals.push(opts.mapper(parsed));
    }
  }

  return evals;
};

export const isJsonDbEval = (input: unknown): input is JsonDBEval => {
  return (
    typeof input === "object" &&
    !!input &&
    "name" in input &&
    typeof input.name === "string"
  );
};

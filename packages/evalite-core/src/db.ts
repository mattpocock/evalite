import type * as BetterSqlite3 from "better-sqlite3";
import Database from "better-sqlite3";
import type { Evalite } from "./index.js";
import type { TaskState } from "vitest";
import { max } from "./utils.js";

export type SQLiteDatabase = BetterSqlite3.Database;

export const createDatabase = (url: string): BetterSqlite3.Database => {
  const db: BetterSqlite3.Database = new Database(url);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runType TEXT NOT NULL, -- full, partial
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS evals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      filepath TEXT NOT NULL,
      duration INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    );

    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eval_id INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      input TEXT NOT NULL, -- JSON
      output TEXT NOT NULL, -- JSON
      expected TEXT, -- JSON
      col_order INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (eval_id) REFERENCES evals(id)
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      score FLOAT NOT NULL,
      description TEXT,
      metadata TEXT, -- JSON
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (result_id) REFERENCES results(id)
    );

    CREATE TABLE IF NOT EXISTS traces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_id INTEGER NOT NULL,
      input TEXT NOT NULL, -- JSON
      output TEXT NOT NULL, -- JSON
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      prompt_tokens INTEGER,
      completion_tokens INTEGER,
      col_order INTEGER NOT NULL,
      FOREIGN KEY (result_id) REFERENCES results(id)
    );
  `);

  // Add status key
  try {
    db.exec(
      `ALTER TABLE evals ADD COLUMN status TEXT NOT NULL DEFAULT 'success';`
    );
  } catch (e) {}

  return db;
};

export declare namespace Db {
  export type Run = {
    id: number;
    runType: Evalite.RunType;
    created_at: string;
  };

  export type Eval = {
    id: number;
    run_id: number;
    name: string;
    status: "fail" | "success";
    filepath: string;
    duration: number;
    created_at: string;
  };

  export type Result = {
    id: number;
    eval_id: number;
    duration: number;
    input: unknown;
    output: unknown;
    expected?: unknown;
    created_at: string;
    col_order: number;
  };

  export type Score = {
    id: number;
    result_id: number;
    name: string;
    score: number;
    description?: string;
    metadata?: unknown;
    created_at: string;
  };

  export type Trace = {
    id: number;
    result_id: number;
    input: unknown;
    output: unknown;
    start_time: number;
    end_time: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    col_order: number;
  };
}

export const saveRun = (
  db: BetterSqlite3.Database,
  {
    files,
    runType,
  }: {
    runType: Evalite.RunType;
    files: {
      name: string;
      filepath: string;
      tasks: {
        name: string;
        result?: {
          state: TaskState;
        };
        tasks?: {
          name: string;
          result?: {
            state: TaskState;
          };
          meta: {
            evalite?: Evalite.TaskMeta;
          };
        }[];
      }[];
    }[];
  }
) => {
  const runId = db
    .prepare(
      `
        INSERT INTO runs (runType)
        VALUES (@runType)
      `
    )
    .run({ runType }).lastInsertRowid;

  for (const file of files) {
    for (const suite of file.tasks) {
      if (!suite.tasks) {
        throw new Error(
          "An unknown error occurred - did you nest evalite inside a describe block?"
        );
      }

      const evalId = db
        .prepare(
          `
          INSERT INTO evals (run_id, name, filepath, duration, status)
          VALUES (@runId, @name, @filepath, @duration, @status)
        `
        )
        .run({
          runId,
          name: suite.name,
          filepath: file.filepath,
          duration: max(suite.tasks, (t) => t.meta.evalite?.duration ?? 0),
          status: suite.result?.state === "fail" ? "fail" : "success",
        }).lastInsertRowid;

      for (const task of suite.tasks) {
        if (task.meta.evalite?.result) {
          const { duration, input, output, expected, scores, traces, order } =
            task.meta.evalite.result;
          const resultId = db
            .prepare(
              `
                INSERT INTO results (eval_id, duration, input, output, expected, col_order)
                VALUES (@evalId, @duration, @input, @output, @expected, @col_order)
              `
            )
            .run({
              evalId,
              duration,
              input: JSON.stringify(input),
              output: JSON.stringify(output),
              expected: JSON.stringify(expected),
              col_order: order,
            }).lastInsertRowid;

          for (const score of scores) {
            db.prepare(
              `
                INSERT INTO scores (result_id, name, score, description, metadata)
                VALUES (@resultId, @name, @score, @description, @metadata)
              `
            ).run({
              resultId,
              name: score.name,
              score: score.score ?? 0,
              description: score.description,
              metadata: JSON.stringify(score.metadata),
            });
          }

          let traceOrder = 0;
          for (const trace of traces) {
            traceOrder += 1;
            db.prepare(
              `
                  INSERT INTO traces (result_id, input, output, start_time, end_time, prompt_tokens, completion_tokens, col_order)
                  VALUES (@resultId, @input, @output, @start_time, @end_time, @prompt_tokens, @completion_tokens, @col_order)
                `
            ).run({
              resultId,
              input: JSON.stringify(trace.input),
              output: JSON.stringify(trace.output),
              start_time: Math.round(trace.start),
              end_time: Math.round(trace.end),
              prompt_tokens: trace.usage?.promptTokens ?? null,
              completion_tokens: trace.usage?.completionTokens ?? null,
              col_order: traceOrder,
            });
          }
        }
      }
    }
  }
};

export interface ResultWithInlineScoresAndTraces extends Db.Result {
  scores: Db.Score[];
  traces: Db.Trace[];
}

interface EvalWithInlineResults extends Db.Eval {
  results: ResultWithInlineScoresAndTraces[];
}

/**
 * @deprecated
 *
 * Used in existing tests, but in future code should be replaced
 * by more specific queries.
 */
export const getEvalsAsRecord = async (
  db: SQLiteDatabase
): Promise<Record<string, EvalWithInlineResults[]>> => {
  const evals = db.prepare<unknown[], Db.Eval>(`SELECT * FROM evals`).all();

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

  const recordOfEvals: Record<string, EvalWithInlineResults[]> = {};

  for (const evaluation of evals) {
    const key = evaluation.name;
    if (!recordOfEvals[key]) {
      recordOfEvals[key] = [];
    }

    const results = allResults.filter((r) => r.eval_id === evaluation.id);
    const resultsWithScores = results.map((r) => {
      const scores = allScores.filter((s) => s.result_id === r.id);
      const traces = allTraces.filter((t) => t.result_id === r.id);

      return { ...r, scores, traces };
    });

    recordOfEvals[key].push({
      ...evaluation,
      results: resultsWithScores,
    });
  }

  return recordOfEvals;
};

export const getEvals = (db: BetterSqlite3.Database, runIds: number[]) => {
  return db
    .prepare<unknown[], Db.Eval>(
      `
    SELECT * FROM evals
    WHERE run_id IN (${runIds.join(",")})
  `
    )
    .all();
};

export const getResults = (db: BetterSqlite3.Database, evalIds: number[]) => {
  return db
    .prepare<unknown[], Db.Result>(
      `
    SELECT * FROM results
    WHERE eval_id IN (${evalIds.join(",")})
    ORDER BY col_order ASC
  `
    )
    .all()
    .map((r) => jsonParseFields(r, ["input", "output", "expected"]));
};

export const getScores = (db: BetterSqlite3.Database, resultIds: number[]) => {
  return db
    .prepare<unknown[], Db.Score>(
      `
    SELECT * FROM scores
    WHERE result_id IN (${resultIds.join(",")})
  `
    )
    .all()
    .map((r) => jsonParseFields(r, ["metadata"]));
};

export const getTraces = (db: BetterSqlite3.Database, resultIds: number[]) => {
  return db
    .prepare<unknown[], Db.Trace>(
      `
    SELECT * FROM traces
    WHERE result_id IN (${resultIds.join(",")})
    ORDER BY col_order ASC
  `
    )
    .all()
    .map((t) => jsonParseFields(t, ["input", "output"]));
};

export const getMostRecentRun = (
  db: BetterSqlite3.Database,
  runType: Evalite.RunType
) => {
  const run = db
    .prepare<{ runType: string }, Db.Run>(
      `
    SELECT * FROM runs
    WHERE runType = @runType
    ORDER BY created_at DESC
    LIMIT 1
  `
    )
    .get({ runType });

  return run;
};

export const getPreviousEval = (
  db: BetterSqlite3.Database,
  name: string,
  startTime: string
) => {
  const evaluation = db
    .prepare<{ name: string; startTime: string }, Db.Eval>(
      `
    SELECT * FROM evals
    WHERE name = @name AND created_at < @startTime
    ORDER BY created_at DESC
    LIMIT 1
  `
    )
    .get({ name, startTime });

  return evaluation;
};

export const getAverageScoresFromResults = (
  db: BetterSqlite3.Database,
  resultIds: number[]
): {
  result_id: number;
  average: number;
}[] => {
  return db
    .prepare<unknown[], { result_id: number; average: number }>(
      `
    SELECT result_id, AVG(score) as average
    FROM scores
    WHERE result_id IN (${resultIds.join(",")})
    GROUP BY result_id
  `
    )
    .all();
};

export const getEvalsAverageScores = (
  db: BetterSqlite3.Database,
  evalIds: number[]
): {
  eval_id: number;
  average: number;
}[] => {
  const result = db
    .prepare<unknown[], { eval_id: number; average: number }>(
      `
    SELECT r.eval_id, AVG(s.score) as average
    FROM scores s
    JOIN results r ON s.result_id = r.id
    WHERE r.eval_id IN (${evalIds.join(",")})
    GROUP BY r.eval_id
  `
    )
    .all();

  return result;
};

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export const jsonParseFields = <T extends object, K extends keyof T>(
  obj: T,
  fields: K[]
): Prettify<Omit<T, K> & Record<K, unknown>> => {
  const objToReturn: any = {};

  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key];
    if ((fields as any).includes(key)) {
      objToReturn[key] = JSON.parse(value);
    } else {
      objToReturn[key] = value;
    }
  }

  return objToReturn;
};

/**
 * Defaults to most recent if timestamp not passed
 */
export const getEvalByName = (
  db: BetterSqlite3.Database,
  name: string,
  timestamp?: string
) => {
  return db
    .prepare<{ name: string; timestamp?: string }, Db.Eval>(
      `
    SELECT * FROM evals
    WHERE name = @name
    ${timestamp ? "AND created_at = @timestamp" : ""}
    ORDER BY created_at DESC
    LIMIT 1
  `
    )
    .get({ name, timestamp });
};

export const getHistoricalEvalsWithScoresByName = (
  db: BetterSqlite3.Database,
  name: string
): (Db.Eval & { average_score: number })[] => {
  return db
    .prepare<{ name: string }, Db.Eval & { average_score: number }>(
      `
    SELECT evals.*, AVG(scores.score) as average_score
    FROM evals
    LEFT JOIN results ON evals.id = results.eval_id
    LEFT JOIN scores ON results.id = scores.result_id
    WHERE evals.name = @name
    GROUP BY evals.id
    ORDER BY evals.created_at ASC
  `
    )
    .all({ name });
};

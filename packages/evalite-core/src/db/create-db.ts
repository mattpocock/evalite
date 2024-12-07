import type * as BetterSqlite3 from "better-sqlite3";
import Database from "better-sqlite3";
import type { Evalite } from "../index.js";

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
      input JSON NOT NULL,
      output JSON NOT NULL,
      expected JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (eval_id) REFERENCES evals(id)
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      score FLOAT NOT NULL,
      description TEXT,
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (result_id) REFERENCES results(id)
    );

    CREATE TABLE IF NOT EXISTS traces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_id INTEGER NOT NULL,
      input JSON NOT NULL,
      output JSON NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      prompt_tokens INTEGER,
      completion_tokens INTEGER,
      FOREIGN KEY (result_id) REFERENCES results(id)
    );
  `);

  return db;
};

export declare namespace Db {
  export type Run = {
    id: number;
    runType: "full" | "partial";
    created_at: string;
  };

  export type Eval = {
    id: number;
    run_id: number;
    name: string;
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
  };
}

export const saveRun = (
  db: BetterSqlite3.Database,
  {
    files,
    runType,
  }: {
    runType: "full" | "partial";
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
  }
) => {
  db.transaction(() => {
    const runId = db
      .prepare(
        `
        INSERT INTO runs (runType)
        VALUES (@runType)
      `
      )
      .run({ runType }).lastInsertRowid;

    for (const file of files) {
      for (const task of file.tasks) {
        const evalId = db
          .prepare(
            `
          INSERT INTO evals (run_id, name, filepath, duration)
          VALUES (@runId, @name, @filepath, @duration)
        `
          )
          .run({
            runId,
            name: task.name,
            filepath: file.filepath,
            duration: task.meta.evalite?.duration,
          }).lastInsertRowid;

        if (task.meta.evalite) {
          for (const {
            input,
            output: result,
            scores,
            duration,
            expected,
            traces,
          } of task.meta.evalite.results) {
            const resultId = db
              .prepare(
                `
              INSERT INTO results (eval_id, duration, input, output, expected)
              VALUES (@evalId, @duration, @input, @output, @expected)
            `
              )
              .run({
                evalId,
                duration,
                input,
                output: result,
                expected,
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
                metadata: score.metadata,
              });
            }

            for (const trace of traces) {
              db.prepare(
                `
                INSERT INTO traces (result_id, input, output, start_time, end_time, prompt_tokens, completion_tokens)
                VALUES (@resultId, @input, @output, @start_time, @end_time, @prompt_tokens, @completion_tokens)
              `
              ).run({
                resultId,
                input: trace.input,
                output: trace.output,
                start_time: trace.start,
                end_time: trace.end,
                prompt_tokens: trace.usage?.promptTokens,
                completion_tokens: trace.usage?.completionTokens,
              });
            }
          }
        }
      }
    }
  })();
};

export const getRun = (
  db: BetterSqlite3.Database,
  runId: number
): Db.Run | undefined => {
  return db
    .prepare<{ runId: number }, Db.Run>(
      `
    SELECT * FROM runs
    WHERE id = @runId
  `
    )
    .get({ runId });
};

export const getEvals = (
  db: BetterSqlite3.Database,
  runId: number
): Db.Eval[] => {
  return db
    .prepare<{ runId: number }, Db.Eval>(
      `
    SELECT * FROM evals
    WHERE run_id = @runId
  `
    )
    .all({ runId });
};

export const getResults = (
  db: BetterSqlite3.Database,
  evalIds: number[]
): Db.Result[] => {
  return db
    .prepare<unknown[], Db.Result>(
      `
    SELECT * FROM results
    WHERE eval_id IN (${evalIds.join(",")})
  `
    )
    .all();
};

export const getScores = (
  db: BetterSqlite3.Database,
  resultIds: number[]
): Db.Score[] => {
  return db
    .prepare<unknown[], Db.Score>(
      `
    SELECT * FROM scores
    WHERE result_id IN (${resultIds.join(",")})
  `
    )
    .all();
};

export const getTraces = (
  db: BetterSqlite3.Database,
  resultIds: number[]
): Db.Trace[] => {
  return db
    .prepare<unknown[], Db.Trace>(
      `
    SELECT * FROM traces
    WHERE result_id IN (${resultIds.join(",")})
  `
    )
    .all();
};

export const getMostRecentRun = (
  db: BetterSqlite3.Database,
  runType: "full" | "partial"
):
  | {
      run: Db.Run;
      evals: Db.Eval[];
      results: Db.Result[];
      scores: Db.Score[];
      traces: Db.Trace[];
    }
  | undefined => {
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

  if (!run) {
    return;
  }

  const evals = getEvals(db, run.id);
  const results = getResults(
    db,
    evals.map((e) => e.id)
  );
  const scores = getScores(
    db,
    results.map((r) => r.id)
  );
  const traces = getTraces(
    db,
    results.map((r) => r.id)
  );

  return { run, evals, results, scores, traces };
};

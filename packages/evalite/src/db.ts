import type * as BetterSqlite3 from "better-sqlite3";
import Database from "better-sqlite3";
import type { Evalite } from "./types.js";
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

  // Add status key to evals table
  try {
    db.exec(
      `ALTER TABLE evals ADD COLUMN status TEXT NOT NULL DEFAULT 'success';`
    );
  } catch (e) {}

  // Add status key to results table
  try {
    db.exec(
      `ALTER TABLE results ADD COLUMN status TEXT NOT NULL DEFAULT 'success';`
    );
  } catch (e) {}

  // Add rendered_columns key to results table
  try {
    db.exec(`ALTER TABLE results ADD COLUMN rendered_columns TEXT`);
  } catch (e) {}

  // Rename prompt_tokens/completion_tokens to input_tokens/output_tokens and add total_tokens
  try {
    db.exec(`
      ALTER TABLE traces RENAME COLUMN prompt_tokens TO input_tokens;
      ALTER TABLE traces RENAME COLUMN completion_tokens TO output_tokens;
      ALTER TABLE traces ADD COLUMN total_tokens INTEGER;
    `);
  } catch (e) {}

  // Add variant_name and variant_group columns to evals table
  try {
    db.exec(`ALTER TABLE evals ADD COLUMN variant_name TEXT`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE evals ADD COLUMN variant_group TEXT`);
  } catch (e) {}

  return db;
};

export declare namespace Db {
  export type Run = {
    id: number;
    runType: Evalite.RunType;
    created_at: string;
  };

  export type EvalStatus = "fail" | "success" | "running";

  export type Eval = {
    id: number;
    run_id: number;
    name: string;
    status: EvalStatus;
    filepath: string;
    duration: number;
    created_at: string;
    variant_name?: string;
    variant_group?: string;
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
    status: Evalite.ResultStatus;
    rendered_columns?: unknown;
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
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    col_order: number;
  };
}
/**
 * @deprecated
 */
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
                  INSERT INTO traces (result_id, input, output, start_time, end_time, input_tokens, output_tokens, total_tokens, col_order)
                  VALUES (@resultId, @input, @output, @start_time, @end_time, @input_tokens, @output_tokens, @total_tokens, @col_order)
                `
            ).run({
              resultId,
              input: JSON.stringify(trace.input),
              output: JSON.stringify(trace.output),
              start_time: Math.round(trace.start),
              end_time: Math.round(trace.end),
              input_tokens: trace.usage?.inputTokens ?? null,
              output_tokens: trace.usage?.outputTokens ?? null,
              total_tokens: trace.usage?.totalTokens ?? null,
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

export const getEvals = (
  db: BetterSqlite3.Database,
  runIds: number[],
  allowedStatuses: Db.EvalStatus[]
) => {
  return db
    .prepare<unknown[], Db.Eval>(
      `
    SELECT * FROM evals
    WHERE run_id IN (${runIds.join(",")})
    AND status IN (${allowedStatuses.map((s) => `'${s}'`).join(",")})
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
    .map((r) =>
      jsonParseFields(r, ["input", "output", "expected", "rendered_columns"])
    );
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

export const getPreviousCompletedEval = (
  db: BetterSqlite3.Database,
  name: string,
  startTime: string
) => {
  const evaluation = db
    .prepare<{ name: string; startTime: string }, Db.Eval>(
      `
    SELECT * FROM evals
    WHERE name = @name AND created_at < @startTime
    AND status != 'running'
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
  opts: {
    name: string;
    timestamp?: string;
    statuses?: Db.EvalStatus[];
  }
) => {
  return db
    .prepare<{ name: string; timestamp?: string }, Db.Eval>(
      `
    SELECT * FROM evals
    WHERE name = @name
    ${opts.timestamp ? "AND created_at = @timestamp" : ""}
    ${opts.statuses ? `AND status IN (${opts.statuses.map((s) => `'${s}'`).join(",")})` : ""}
    ORDER BY created_at DESC
    LIMIT 1
  `
    )
    .get({ name: opts.name, timestamp: opts.timestamp });
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
    AND evals.status != 'running'
    GROUP BY evals.id
    ORDER BY evals.created_at ASC
  `
    )
    .all({ name });
};

export const createEvalIfNotExists = ({
  db,
  runId,
  name,
  filepath,
  variantName,
  variantGroup,
}: {
  db: SQLiteDatabase;
  runId: number | bigint;
  name: string;
  filepath: string;
  variantName?: string;
  variantGroup?: string;
}): number | bigint => {
  let evaluationId: number | bigint | undefined = db
    .prepare<
      { name: string; runId: number | bigint },
      { id: number }
    >(`SELECT id FROM evals WHERE name = @name AND run_id = @runId`)
    .get({ name, runId })?.id;

  if (!evaluationId) {
    evaluationId = db
      .prepare(
        `INSERT INTO evals (run_id, name, filepath, duration, status, variant_name, variant_group)
         VALUES (@runId, @name, @filepath, @duration, @status, @variantName, @variantGroup)`
      )
      .run({
        runId,
        name,
        filepath,
        duration: 0,
        status: "running",
        variantName: variantName ?? null,
        variantGroup: variantGroup ?? null,
      }).lastInsertRowid;
  }

  return evaluationId;
};

export const createRun = ({
  db,
  runType,
}: {
  db: SQLiteDatabase;
  runType: Evalite.RunType;
}): number | bigint => {
  return db
    .prepare(`INSERT INTO runs (runType) VALUES (@runType)`)
    .run({ runType }).lastInsertRowid;
};

export const insertResult = ({
  db,
  evalId,
  order,
  input,
  expected,
  output,
  duration,
  status,
  renderedColumns,
}: {
  db: SQLiteDatabase;
  evalId: number | bigint;
  order: number;
  input: unknown;
  expected: unknown;
  output: unknown;
  duration: number;
  status: string;
  renderedColumns: unknown;
}): number | bigint => {
  return db
    .prepare(
      `INSERT INTO results (eval_id, col_order, input, expected, output, duration, status, rendered_columns)
       VALUES (@eval_id, @col_order, @input, @expected, @output, @duration, @status, @rendered_columns)`
    )
    .run({
      eval_id: evalId,
      col_order: order,
      input: JSON.stringify(input),
      expected: JSON.stringify(expected),
      output: JSON.stringify(output),
      duration,
      status,
      rendered_columns: JSON.stringify(renderedColumns),
    }).lastInsertRowid;
};

export const updateResult = ({
  db,
  resultId,
  output,
  duration,
  status,
  renderedColumns,
  input,
  expected,
}: {
  db: SQLiteDatabase;
  resultId: number | bigint;
  output: unknown;
  duration: number;
  input: unknown;
  expected: unknown;
  status: string;
  renderedColumns: unknown;
}) => {
  db.prepare(
    `UPDATE results
     SET
      output = @output,
      duration = @duration,
      input = @input,
      expected = @expected,
      status = @status,
      rendered_columns = @rendered_columns
     WHERE id = @id`
  ).run({
    id: resultId,
    output: JSON.stringify(output),
    duration,
    status,
    rendered_columns: JSON.stringify(renderedColumns),
    input: JSON.stringify(input),
    expected: JSON.stringify(expected),
  });
};

export const insertScore = ({
  db,
  resultId,
  description,
  name,
  score,
  metadata,
}: {
  db: SQLiteDatabase;
  resultId: number | bigint;
  description: string | undefined;
  name: string;
  score: number;
  metadata: unknown;
}) => {
  db.prepare(
    `INSERT INTO scores (result_id, name, score, metadata, description)
     VALUES (@result_id, @name, @score, @metadata, @description)`
  ).run({
    result_id: resultId,
    description,
    name,
    score,
    metadata: JSON.stringify(metadata),
  });
};

export const insertTrace = ({
  db,
  resultId,
  input,
  output,
  start,
  end,
  inputTokens,
  outputTokens,
  totalTokens,
  order,
}: {
  db: SQLiteDatabase;
  resultId: number | bigint;
  input: unknown;
  output: unknown;
  start: number;
  end: number;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  totalTokens: number | undefined;
  order: number;
}) => {
  db.prepare(
    `INSERT INTO traces (result_id, input, output, start_time, end_time, input_tokens, output_tokens, total_tokens, col_order)
     VALUES (@result_id, @input, @output, @start_time, @end_time, @input_tokens, @output_tokens, @total_tokens, @col_order)`
  ).run({
    result_id: resultId,
    input: JSON.stringify(input),
    output: JSON.stringify(output),
    start_time: Math.round(start),
    end_time: Math.round(end),
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    col_order: order,
  });
};

export const updateEvalStatusAndDuration = ({
  db,
  evalId,
  status,
}: {
  db: SQLiteDatabase;
  evalId: number | bigint;
  status: Db.EvalStatus;
}) => {
  db.prepare(
    `UPDATE evals
     SET status = @status,
     duration = (SELECT MAX(duration) FROM results WHERE eval_id = @id)
     WHERE id = @id`
  ).run({
    id: evalId,
    status,
  });
};

export const findResultByEvalIdAndOrder = ({
  db,
  evalId,
  order,
}: {
  db: SQLiteDatabase;
  evalId: number | bigint;
  order: number;
}): number | undefined => {
  return db
    .prepare<
      {},
      { id: number }
    >(`SELECT id FROM results WHERE eval_id = @eval_id AND col_order = @col_order`)
    .get({
      eval_id: evalId,
      col_order: order,
    })?.id;
};

export const getAllResultsForEval = ({
  db,
  evalId,
}: {
  db: SQLiteDatabase;
  evalId: number | bigint;
}): Array<{ id: number; status: Evalite.ResultStatus }> => {
  return db
    .prepare<
      { eval_id: number | bigint },
      { id: number; status: Evalite.ResultStatus }
    >(`SELECT id, status FROM results WHERE eval_id = @eval_id`)
    .all({ eval_id: evalId });
};

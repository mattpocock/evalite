import type * as BetterSqlite3 from "better-sqlite3";
import { jsonParseFields, jsonParseFieldsArray } from "./utils.js";
import type { Evalite } from "../types.js";
import type { EvaliteAdapter } from "./types.js";
import { mkdir } from "fs/promises";
import path from "path";
import Database from "better-sqlite3";

export type { EvaliteAdapter };

const createDatabase = (url: string): BetterSqlite3.Database => {
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

export class SqliteAdapter implements EvaliteAdapter {
  private db: BetterSqlite3.Database;

  private constructor(db: BetterSqlite3.Database) {
    this.db = db;
  }

  private createEvalIfNotExists({
    runId,
    name,
    filepath,
    variantName,
    variantGroup,
  }: {
    runId: number | bigint;
    name: string;
    filepath: string;
    variantName?: string;
    variantGroup?: string;
  }): Evalite.Adapter.Entities.Eval {
    let evaluationId: number | bigint | undefined = this.db
      .prepare<
        { name: string; runId: number | bigint },
        { id: number }
      >(`SELECT id FROM evals WHERE name = @name AND run_id = @runId`)
      .get({ name, runId })?.id;

    if (!evaluationId) {
      evaluationId = this.db
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

    return this.db
      .prepare<
        { id: number | bigint },
        Evalite.Adapter.Entities.Eval
      >(`SELECT * FROM evals WHERE id = @id`)
      .get({ id: evaluationId })!;
  }

  private createRun({
    runType,
  }: {
    runType: Evalite.RunType;
  }): Evalite.Adapter.Entities.Run {
    const id = this.db
      .prepare(`INSERT INTO runs (runType) VALUES (@runType)`)
      .run({ runType }).lastInsertRowid;

    return this.db
      .prepare<
        { id: number | bigint },
        Evalite.Adapter.Entities.Run
      >(`SELECT * FROM runs WHERE id = @id`)
      .get({ id })!;
  }

  private insertResult({
    evalId,
    order,
    input,
    expected,
    output,
    duration,
    status,
    renderedColumns,
  }: {
    evalId: number | bigint;
    order: number;
    input: unknown;
    expected: unknown;
    output: unknown;
    duration: number;
    status: string;
    renderedColumns: unknown;
  }): Evalite.Adapter.Entities.Result {
    const id = this.db
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

    return jsonParseFields(
      this.db
        .prepare<
          { id: number | bigint },
          Evalite.Adapter.Entities.Result
        >(`SELECT * FROM results WHERE id = @id`)
        .get({ id })!,
      ["input", "output", "expected", "rendered_columns"]
    );
  }

  private updateResult({
    resultId,
    output,
    duration,
    status,
    renderedColumns,
    input,
    expected,
  }: {
    resultId: number | bigint;
    output: unknown;
    duration: number;
    input: unknown;
    expected: unknown;
    status: string;
    renderedColumns: unknown;
  }): Evalite.Adapter.Entities.Result {
    this.db
      .prepare(
        `UPDATE results
       SET
        output = @output,
        duration = @duration,
        input = @input,
        expected = @expected,
        status = @status,
        rendered_columns = @rendered_columns
       WHERE id = @id`
      )
      .run({
        id: resultId,
        output: JSON.stringify(output),
        duration,
        status,
        rendered_columns: JSON.stringify(renderedColumns),
        input: JSON.stringify(input),
        expected: JSON.stringify(expected),
      });

    return jsonParseFields(
      this.db
        .prepare<
          { id: number | bigint },
          Evalite.Adapter.Entities.Result
        >(`SELECT * FROM results WHERE id = @id`)
        .get({ id: resultId })!,
      ["input", "output", "expected", "rendered_columns"]
    );
  }

  private insertScore({
    resultId,
    description,
    name,
    score,
    metadata,
  }: {
    resultId: number | bigint;
    description: string | undefined;
    name: string;
    score: number;
    metadata: unknown;
  }): Evalite.Adapter.Entities.Score {
    const id = this.db
      .prepare(
        `INSERT INTO scores (result_id, name, score, metadata, description)
     VALUES (@result_id, @name, @score, @metadata, @description)`
      )
      .run({
        result_id: resultId,
        description,
        name,
        score,
        metadata: JSON.stringify(metadata),
      }).lastInsertRowid;

    return jsonParseFields(
      this.db
        .prepare<
          { id: number | bigint },
          Evalite.Adapter.Entities.Score
        >(`SELECT * FROM scores WHERE id = @id`)
        .get({ id })!,
      ["metadata"]
    );
  }

  private insertTrace({
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
    resultId: number | bigint;
    input: unknown;
    output: unknown;
    start: number;
    end: number;
    inputTokens: number | undefined;
    outputTokens: number | undefined;
    totalTokens: number | undefined;
    order: number;
  }): Evalite.Adapter.Entities.Trace {
    const id = this.db
      .prepare(
        `INSERT INTO traces (result_id, input, output, start_time, end_time, input_tokens, output_tokens, total_tokens, col_order)
     VALUES (@result_id, @input, @output, @start_time, @end_time, @input_tokens, @output_tokens, @total_tokens, @col_order)`
      )
      .run({
        result_id: resultId,
        input: JSON.stringify(input),
        output: JSON.stringify(output),
        start_time: Math.round(start),
        end_time: Math.round(end),
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        col_order: order,
      }).lastInsertRowid;

    return jsonParseFields(
      this.db
        .prepare<
          { id: number | bigint },
          Evalite.Adapter.Entities.Trace
        >(`SELECT * FROM traces WHERE id = @id`)
        .get({ id })!,
      ["input", "output"]
    );
  }

  private updateEvalStatusAndDuration({
    evalId,
    status,
  }: {
    evalId: number | bigint;
    status: Evalite.Adapter.Entities.EvalStatus;
  }): Evalite.Adapter.Entities.Eval {
    this.db
      .prepare(
        `UPDATE evals
       SET status = @status
       WHERE id = @id`
      )
      .run({
        id: evalId,
        status,
      });

    return this.db
      .prepare<
        { id: number | bigint },
        Evalite.Adapter.Entities.Eval
      >(`SELECT * FROM evals WHERE id = @id`)
      .get({ id: evalId })!;
  }

  /**
   * Create a new SQLite adapter
   */
  static create(location: string): SqliteAdapter {
    const db = createDatabase(location);
    return new SqliteAdapter(db);
  }

  runs = {
    create: async (
      opts: Evalite.Adapter.Runs.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Run> => {
      return this.createRun({ runType: opts.runType });
    },

    getMany: async (
      opts?: Evalite.Adapter.Runs.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Run[]> => {
      let query = `SELECT * FROM runs WHERE 1=1`;
      const params: {
        ids?: number[];
        runType?: Evalite.RunType;
        createdAt?: string;
        createdAfter?: string;
        createdBefore?: string;
      } = {};

      if (opts?.ids && opts.ids.length > 0) {
        query += ` AND id IN (${opts.ids.join(",")})`;
      }

      if (opts?.runType) {
        query += ` AND runType = @runType`;
        params.runType = opts.runType;
      }

      if (opts?.createdAt) {
        query += ` AND created_at = @createdAt`;
        params.createdAt = opts.createdAt;
      }

      if (opts?.createdAfter) {
        query += ` AND created_at > @createdAfter`;
        params.createdAfter = opts.createdAfter;
      }

      if (opts?.createdBefore) {
        query += ` AND created_at < @createdBefore`;
        params.createdBefore = opts.createdBefore;
      }

      query += ` ORDER BY ${opts?.orderBy ?? "created_at"} ${opts?.orderDirection ?? "DESC"}`;

      if (opts?.limit) {
        query += ` LIMIT ${opts.limit}`;
      }

      return this.db
        .prepare<typeof params, Evalite.Adapter.Entities.Run>(query)
        .all(params);
    },
  };

  evals = {
    createOrGet: async (
      opts: Evalite.Adapter.Evals.CreateOrGetOpts
    ): Promise<Evalite.Adapter.Entities.Eval> => {
      return this.createEvalIfNotExists({
        ...opts,
      });
    },

    update: async (
      opts: Evalite.Adapter.Evals.UpdateOpts
    ): Promise<Evalite.Adapter.Entities.Eval> => {
      return this.updateEvalStatusAndDuration({
        evalId: opts.id,
        status: opts.status,
      });
    },

    getMany: async (
      opts?: Evalite.Adapter.Evals.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Eval[]> => {
      let query = `SELECT * FROM evals WHERE 1=1`;
      const params: {
        ids?: number[];
        runIds?: number[];
        name?: string;
        statuses?: Evalite.Adapter.Entities.EvalStatus[];
        createdAt?: string;
        createdAfter?: string;
        createdBefore?: string;
      } = {};

      if (opts?.ids && opts.ids.length > 0) {
        query += ` AND id IN (${opts.ids.join(",")})`;
      }

      if (opts?.runIds && opts.runIds.length > 0) {
        query += ` AND run_id IN (${opts.runIds.join(",")})`;
      }

      if (opts?.name) {
        query += ` AND name = @name`;
        params.name = opts.name;
      }

      if (opts?.statuses && opts.statuses.length > 0) {
        query += ` AND status IN (${opts.statuses.map((s) => `'${s}'`).join(",")})`;
      }

      if (opts?.createdAt) {
        query += ` AND created_at = @createdAt`;
        params.createdAt = opts.createdAt;
      }

      if (opts?.createdAfter) {
        query += ` AND created_at > @createdAfter`;
        params.createdAfter = opts.createdAfter;
      }

      if (opts?.createdBefore) {
        query += ` AND created_at < @createdBefore`;
        params.createdBefore = opts.createdBefore;
      }

      query += ` ORDER BY ${opts?.orderBy ?? "created_at"} ${opts?.orderDirection ?? "DESC"}`;

      if (opts?.limit) {
        query += ` LIMIT ${opts.limit}`;
      }

      return this.db
        .prepare<typeof params, Evalite.Adapter.Entities.Eval>(query)
        .all(params);
    },
  };

  results = {
    create: async (
      opts: Evalite.Adapter.Results.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Result> => {
      return this.insertResult({
        evalId: opts.evalId,
        order: opts.order,
        input: opts.input,
        expected: opts.expected,
        output: opts.output,
        duration: opts.duration,
        status: opts.status,
        renderedColumns: opts.renderedColumns,
      });
    },

    update: async (
      opts: Evalite.Adapter.Results.UpdateOpts
    ): Promise<Evalite.Adapter.Entities.Result> => {
      return this.updateResult({
        resultId: opts.id,
        ...opts,
      });
    },

    getMany: async (
      opts?: Evalite.Adapter.Results.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Result[]> => {
      let query = `SELECT * FROM results WHERE 1=1`;
      const params: {
        order?: number;
        statuses?: Evalite.ResultStatus[];
      } = {};

      if (opts?.ids && opts.ids.length > 0) {
        query += ` AND id IN (${opts.ids.join(",")})`;
      }

      if (opts?.evalIds && opts.evalIds.length > 0) {
        query += ` AND eval_id IN (${opts.evalIds.join(",")})`;
      }

      if (opts?.order !== undefined) {
        query += ` AND col_order = @order`;
        params.order = opts.order;
      }

      if (opts?.statuses && opts.statuses.length > 0) {
        query += ` AND status IN (${opts.statuses.map((s) => `'${s}'`).join(",")})`;
      }

      query += ` ORDER BY col_order ASC`;

      const results = this.db
        .prepare<typeof params, Evalite.Adapter.Entities.Result>(query)
        .all(params);

      return jsonParseFieldsArray(results, [
        "input",
        "output",
        "expected",
        "rendered_columns",
      ]);
    },
  };

  scores = {
    create: async (
      opts: Evalite.Adapter.Scores.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Score> => {
      return this.insertScore({
        resultId: opts.resultId,
        name: opts.name,
        score: opts.score,
        description: opts.description ?? undefined,
        metadata: opts.metadata,
      });
    },

    getMany: async (
      opts?: Evalite.Adapter.Scores.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Score[]> => {
      let query = `SELECT * FROM scores WHERE 1=1`;

      if (opts?.ids && opts.ids.length > 0) {
        query += ` AND id IN (${opts.ids.join(",")})`;
      }

      if (opts?.resultIds && opts.resultIds.length > 0) {
        query += ` AND result_id IN (${opts.resultIds.join(",")})`;
      }

      const scores = this.db
        .prepare<{}, Evalite.Adapter.Entities.Score>(query)
        .all({});

      return jsonParseFieldsArray(scores, ["metadata"]);
    },
  };

  traces = {
    create: async (
      opts: Evalite.Adapter.Traces.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Trace> => {
      return this.insertTrace({
        resultId: opts.resultId,
        input: opts.input,
        output: opts.output,
        start: opts.start,
        end: opts.end,
        inputTokens: opts.inputTokens ?? undefined,
        outputTokens: opts.outputTokens ?? undefined,
        totalTokens: opts.totalTokens ?? undefined,
        order: opts.order,
      });
    },

    getMany: async (
      opts?: Evalite.Adapter.Traces.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Trace[]> => {
      let query = `SELECT * FROM traces WHERE 1=1`;

      if (opts?.ids && opts.ids.length > 0) {
        query += ` AND id IN (${opts.ids.join(",")})`;
      }

      if (opts?.resultIds && opts.resultIds.length > 0) {
        query += ` AND result_id IN (${opts.resultIds.join(",")})`;
      }

      query += ` ORDER BY col_order ASC`;

      const traces = this.db
        .prepare<{}, Evalite.Adapter.Entities.Trace>(query)
        .all({});

      return jsonParseFieldsArray(traces, ["input", "output"]);
    },
  };

  async close(): Promise<void> {
    this.db.close();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

/**
 * Create a new SQLite adapter
 * @param dbLocation - Path to the SQLite database file
 * @returns A new SqliteAdapter instance
 */
export const createSqliteAdapter = async (
  dbLocation: string
): Promise<SqliteAdapter> => {
  await mkdir(path.dirname(dbLocation), { recursive: true });
  return SqliteAdapter.create(dbLocation);
};

import type * as BetterSqlite3 from "better-sqlite3";
import { jsonParseFields, jsonParseFieldsArray } from "./utils.js";
import type { Evalite } from "../types.js";
import { mkdir } from "fs/promises";
import path from "path";
import Database from "better-sqlite3";

const tableNames = {
  runs: "runs",
  suites: "suites",
  evals: "evals",
  scores: "scores",
  traces: "traces",
  cache: "cache",
};

const createDatabase = (url: string): BetterSqlite3.Database => {
  const db: BetterSqlite3.Database = new Database(url);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${tableNames.runs} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runType TEXT NOT NULL, -- full, partial
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${tableNames.suites} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      filepath TEXT NOT NULL,
      duration INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    );

    CREATE TABLE IF NOT EXISTS ${tableNames.evals} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suite_id INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      input TEXT NOT NULL, -- JSON
      output TEXT NOT NULL, -- JSON
      expected TEXT, -- JSON
      col_order INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (suite_id) REFERENCES suites(id)
    );

    CREATE TABLE IF NOT EXISTS ${tableNames.scores} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eval_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      score FLOAT NOT NULL,
      description TEXT,
      metadata TEXT, -- JSON
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (eval_id) REFERENCES evals(id)
    );

    CREATE TABLE IF NOT EXISTS ${tableNames.traces} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eval_id INTEGER NOT NULL,
      input TEXT NOT NULL, -- JSON
      output TEXT NOT NULL, -- JSON
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      prompt_tokens INTEGER,
      completion_tokens INTEGER,
      col_order INTEGER NOT NULL,
      FOREIGN KEY (eval_id) REFERENCES evals(id)
    );

    CREATE TABLE IF NOT EXISTS ${tableNames.cache} (
      key_hash TEXT PRIMARY KEY,
      value TEXT NOT NULL, -- JSON
      duration REAL NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // Add status key to evals table
  try {
    db.exec(
      `ALTER TABLE ${tableNames.suites} ADD COLUMN status TEXT NOT NULL DEFAULT 'success';`
    );
  } catch (e) {}

  // Add status key to evals table
  try {
    db.exec(
      `ALTER TABLE ${tableNames.evals} ADD COLUMN status TEXT NOT NULL DEFAULT 'success';`
    );
  } catch (e) {}

  // Add rendered_columns key to evals table
  try {
    db.exec(`ALTER TABLE ${tableNames.evals} ADD COLUMN rendered_columns TEXT`);
  } catch (e) {}

  // Rename prompt_tokens/completion_tokens to input_tokens/output_tokens and add total_tokens
  try {
    db.exec(`
      ALTER TABLE ${tableNames.traces} RENAME COLUMN prompt_tokens TO input_tokens;
      ALTER TABLE ${tableNames.traces} RENAME COLUMN completion_tokens TO output_tokens;
      ALTER TABLE ${tableNames.traces} ADD COLUMN total_tokens INTEGER;
    `);
  } catch (e) {}

  // Add variant_name and variant_group columns to suites table
  try {
    db.exec(`ALTER TABLE ${tableNames.suites} ADD COLUMN variant_name TEXT`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE ${tableNames.suites} ADD COLUMN variant_group TEXT`);
  } catch (e) {}

  // Add trial_index column to evals table
  try {
    db.exec(`ALTER TABLE ${tableNames.evals} ADD COLUMN trial_index INTEGER`);
  } catch (e) {}

  // Clean up expired cache entries (older than 1 day)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  db.prepare(`DELETE FROM ${tableNames.cache} WHERE created_at < ?`).run(
    oneDayAgo
  );

  return db;
};

export class SqliteStorage implements Evalite.Storage {
  private db: BetterSqlite3.Database;

  private constructor(db: BetterSqlite3.Database) {
    this.db = db;
  }

  private createSuite({
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
  }): Evalite.Storage.Entities.Suite {
    const suiteId = this.db
      .prepare(
        `INSERT INTO ${tableNames.suites} (run_id, name, filepath, duration, status, variant_name, variant_group)
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

    return this.db
      .prepare<
        { id: number | bigint },
        Evalite.Storage.Entities.Suite
      >(`SELECT * FROM ${tableNames.suites} WHERE id = @id`)
      .get({ id: suiteId })!;
  }

  private createRun({
    runType,
  }: {
    runType: Evalite.RunType;
  }): Evalite.Storage.Entities.Run {
    const id = this.db
      .prepare(`INSERT INTO ${tableNames.runs} (runType) VALUES (@runType)`)
      .run({ runType }).lastInsertRowid;

    return this.db
      .prepare<
        { id: number | bigint },
        Evalite.Storage.Entities.Run
      >(`SELECT * FROM ${tableNames.runs} WHERE id = @id`)
      .get({ id })!;
  }

  private insertEval({
    suiteId,
    order,
    input,
    expected,
    output,
    duration,
    status,
    renderedColumns,
    trialIndex,
  }: {
    suiteId: number | bigint;
    order: number;
    input: unknown;
    expected: unknown;
    output: unknown;
    duration: number;
    status: string;
    renderedColumns: unknown;
    trialIndex?: number;
  }): Evalite.Storage.Entities.Eval {
    const id = this.db
      .prepare(
        `INSERT INTO ${tableNames.evals} (suite_id, col_order, input, expected, output, duration, status, rendered_columns, trial_index)
         VALUES (@suite_id, @col_order, @input, @expected, @output, @duration, @status, @rendered_columns, @trial_index)`
      )
      .run({
        suite_id: suiteId,
        col_order: order,
        input: JSON.stringify(input),
        expected: JSON.stringify(expected),
        output: JSON.stringify(output),
        duration,
        status,
        rendered_columns: JSON.stringify(renderedColumns),
        trial_index: trialIndex ?? null,
      }).lastInsertRowid;

    return jsonParseFields(
      this.db
        .prepare<
          { id: number | bigint },
          Evalite.Storage.Entities.Eval
        >(`SELECT * FROM ${tableNames.evals} WHERE id = @id`)
        .get({ id })!,
      ["input", "output", "expected", "rendered_columns"]
    );
  }

  private updateEval({
    evalId,
    output,
    duration,
    status,
    renderedColumns,
    input,
    expected,
    trialIndex,
  }: {
    evalId: number | bigint;
    output: unknown;
    duration: number;
    input: unknown;
    expected: unknown;
    status: string;
    renderedColumns: unknown;
    trialIndex?: number;
  }): Evalite.Storage.Entities.Eval {
    this.db
      .prepare(
        `UPDATE ${tableNames.evals}
       SET
        output = @output,
        duration = @duration,
        input = @input,
        expected = @expected,
        status = @status,
        rendered_columns = @rendered_columns,
        trial_index = @trial_index
       WHERE id = @id`
      )
      .run({
        id: evalId,
        output: JSON.stringify(output),
        duration,
        status,
        trial_index: trialIndex ?? null,
        rendered_columns: JSON.stringify(renderedColumns),
        input: JSON.stringify(input),
        expected: JSON.stringify(expected),
      });

    return jsonParseFields(
      this.db
        .prepare<
          { id: number | bigint },
          Evalite.Storage.Entities.Eval
        >(`SELECT * FROM ${tableNames.evals} WHERE id = @id`)
        .get({ id: evalId })!,
      ["input", "output", "expected", "rendered_columns"]
    );
  }

  private insertScore({
    evalId,
    description,
    name,
    score,
    metadata,
  }: {
    evalId: number | bigint;
    description: string | undefined;
    name: string;
    score: number;
    metadata: unknown;
  }): Evalite.Storage.Entities.Score {
    const scoreId = this.db
      .prepare(
        `INSERT INTO ${tableNames.scores} (eval_id, name, score, metadata, description)
     VALUES (@eval_id, @name, @score, @metadata, @description)`
      )
      .run({
        eval_id: evalId,
        description,
        name,
        score,
        metadata: JSON.stringify(metadata),
      }).lastInsertRowid;

    return jsonParseFields(
      this.db
        .prepare<
          { id: number | bigint },
          Evalite.Storage.Entities.Score
        >(`SELECT * FROM ${tableNames.scores} WHERE id = @id`)
        .get({ id: scoreId })!,
      ["metadata"]
    );
  }

  private insertTrace({
    evalId,
    input,
    output,
    start,
    end,
    inputTokens,
    outputTokens,
    totalTokens,
    order,
  }: {
    evalId: number | bigint;
    input: unknown;
    output: unknown;
    start: number;
    end: number;
    inputTokens: number | undefined;
    outputTokens: number | undefined;
    totalTokens: number | undefined;
    order: number;
  }): Evalite.Storage.Entities.Trace {
    const traceId = this.db
      .prepare(
        `INSERT INTO ${tableNames.traces} (eval_id, input, output, start_time, end_time, input_tokens, output_tokens, total_tokens, col_order)
     VALUES (@eval_id, @input, @output, @start_time, @end_time, @input_tokens, @output_tokens, @total_tokens, @col_order)`
      )
      .run({
        eval_id: evalId,
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
          Evalite.Storage.Entities.Trace
        >(`SELECT * FROM ${tableNames.traces} WHERE id = @id`)
        .get({ id: traceId })!,
      ["input", "output"]
    );
  }

  private updateSuiteStatus({
    suiteId,
    status,
  }: {
    suiteId: number | bigint;
    status: Evalite.Storage.Entities.SuiteStatus;
  }): Evalite.Storage.Entities.Suite {
    this.db
      .prepare(
        `UPDATE ${tableNames.suites}
       SET status = @status
       WHERE id = @id`
      )
      .run({
        id: suiteId,
        status,
      });

    return this.db
      .prepare<
        { id: number | bigint },
        Evalite.Storage.Entities.Suite
      >(`SELECT * FROM ${tableNames.suites} WHERE id = @id`)
      .get({ id: suiteId })!;
  }

  /**
   * Create a new SQLite storage
   */
  static create(location: string): SqliteStorage {
    const db = createDatabase(location);
    return new SqliteStorage(db);
  }

  runs = {
    create: async (
      opts: Evalite.Storage.Runs.CreateOpts
    ): Promise<Evalite.Storage.Entities.Run> => {
      return this.createRun({ runType: opts.runType });
    },

    getMany: async (
      opts?: Evalite.Storage.Runs.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Run[]> => {
      let query = `SELECT * FROM ${tableNames.runs} WHERE 1=1`;
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
        .prepare<typeof params, Evalite.Storage.Entities.Run>(query)
        .all(params);
    },
  };

  suites = {
    create: async (
      opts: Evalite.Storage.Suites.CreateOpts
    ): Promise<Evalite.Storage.Entities.Suite> => {
      return this.createSuite({
        ...opts,
      });
    },

    update: async (
      opts: Evalite.Storage.Suites.UpdateOpts
    ): Promise<Evalite.Storage.Entities.Suite> => {
      return this.updateSuiteStatus({
        suiteId: opts.id,
        status: opts.status,
      });
    },

    getMany: async (
      opts?: Evalite.Storage.Suites.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Suite[]> => {
      let query = `SELECT * FROM ${tableNames.suites} WHERE 1=1`;
      const params: {
        ids?: number[];
        runIds?: number[];
        name?: string;
        statuses?: Evalite.Storage.Entities.SuiteStatus[];
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
        .prepare<typeof params, Evalite.Storage.Entities.Suite>(query)
        .all(params);
    },
  };

  evals = {
    create: async (
      opts: Evalite.Storage.Evals.CreateOpts
    ): Promise<Evalite.Storage.Entities.Eval> => {
      return this.insertEval({
        suiteId: opts.suiteId,
        order: opts.order,
        input: opts.input,
        expected: opts.expected,
        output: opts.output,
        duration: opts.duration,
        status: opts.status,
        renderedColumns: opts.renderedColumns,
        trialIndex: opts.trialIndex,
      });
    },

    update: async (
      opts: Evalite.Storage.Evals.UpdateOpts
    ): Promise<Evalite.Storage.Entities.Eval> => {
      return this.updateEval({
        evalId: opts.id,
        ...opts,
      });
    },

    getMany: async (
      opts?: Evalite.Storage.Evals.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Eval[]> => {
      let query = `SELECT * FROM ${tableNames.evals} WHERE 1=1`;
      const params: {
        order?: number;
        statuses?: Evalite.EvalStatus[];
      } = {};

      if (opts?.ids && opts.ids.length > 0) {
        query += ` AND id IN (${opts.ids.join(",")})`;
      }

      if (opts?.suiteIds && opts.suiteIds.length > 0) {
        query += ` AND suite_id IN (${opts.suiteIds.join(",")})`;
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
        .prepare<typeof params, Evalite.Storage.Entities.Eval>(query)
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
      opts: Evalite.Storage.Scores.CreateOpts
    ): Promise<Evalite.Storage.Entities.Score> => {
      return this.insertScore({
        evalId: opts.evalId,
        name: opts.name,
        score: opts.score,
        description: opts.description ?? undefined,
        metadata: opts.metadata,
      });
    },

    getMany: async (
      opts?: Evalite.Storage.Scores.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Score[]> => {
      let query = `SELECT * FROM ${tableNames.scores} WHERE 1=1`;

      if (opts?.ids && opts.ids.length > 0) {
        query += ` AND id IN (${opts.ids.join(",")})`;
      }

      if (opts?.evalIds && opts.evalIds.length > 0) {
        query += ` AND eval_id IN (${opts.evalIds.join(",")})`;
      }

      const scores = this.db
        .prepare<{}, Evalite.Storage.Entities.Score>(query)
        .all({});

      return jsonParseFieldsArray(scores, ["metadata"]);
    },
  };

  traces = {
    create: async (
      opts: Evalite.Storage.Traces.CreateOpts
    ): Promise<Evalite.Storage.Entities.Trace> => {
      return this.insertTrace({
        evalId: opts.evalId,
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
      opts?: Evalite.Storage.Traces.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Trace[]> => {
      let query = `SELECT * FROM ${tableNames.traces} WHERE 1=1`;

      if (opts?.ids && opts.ids.length > 0) {
        query += ` AND id IN (${opts.ids.join(",")})`;
      }

      if (opts?.evalIds && opts.evalIds.length > 0) {
        query += ` AND eval_id IN (${opts.evalIds.join(",")})`;
      }

      query += ` ORDER BY col_order ASC`;

      const traces = this.db
        .prepare<{}, Evalite.Storage.Entities.Trace>(query)
        .all({});

      return jsonParseFieldsArray(traces, ["input", "output"]);
    },
  };

  cache = {
    get: async (
      keyHash: string
    ): Promise<{ value: unknown; duration: number } | null> => {
      const result = this.db
        .prepare<
          { keyHash: string },
          { value: string; duration: number }
        >(`SELECT value, duration FROM ${tableNames.cache} WHERE key_hash = @keyHash`)
        .get({ keyHash });

      if (!result) {
        return null;
      }

      return {
        value: JSON.parse(result.value),
        duration: result.duration,
      };
    },

    set: async (
      keyHash: string,
      data: { value: unknown; duration: number }
    ): Promise<void> => {
      this.db
        .prepare(
          `INSERT OR REPLACE INTO ${tableNames.cache} (key_hash, value, duration, created_at)
           VALUES (@keyHash, @value, @duration, @createdAt)`
        )
        .run({
          keyHash,
          value: JSON.stringify(data.value),
          duration: data.duration,
          createdAt: Date.now(),
        });
    },

    delete: async (keyHash: string): Promise<void> => {
      this.db
        .prepare(`DELETE FROM ${tableNames.cache} WHERE key_hash = @keyHash`)
        .run({ keyHash });
    },

    clear: async (): Promise<void> => {
      this.db.prepare(`DELETE FROM ${tableNames.cache}`).run();
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
 * Create a new SQLite storage
 * @param dbLocation - Path to the SQLite database file
 * @returns A new SqliteStorage instance
 */
export const createSqliteStorage = async (
  dbLocation: string
): Promise<SqliteStorage> => {
  await mkdir(path.dirname(dbLocation), { recursive: true });
  return SqliteStorage.create(dbLocation);
};

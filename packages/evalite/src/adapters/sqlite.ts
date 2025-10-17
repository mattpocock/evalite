import type * as BetterSqlite3 from "better-sqlite3";
import {
  createDatabase as createSqliteDatabase,
  createEvalIfNotExists as dbCreateEvalIfNotExists,
  createRun as dbCreateRun,
  getAverageScoresFromResults as dbGetAverageScoresFromResults,
  getEvalsAverageScores as dbGetEvalsAverageScores,
  insertResult as dbInsertResult,
  insertScore as dbInsertScore,
  insertTrace as dbInsertTrace,
  updateEvalStatusAndDuration as dbUpdateEvalStatusAndDuration,
  updateResult as dbUpdateResult,
  jsonParseFieldsArray,
} from "../db.js";
import type { Evalite } from "../types.js";
import type { EvaliteAdapter } from "./types.js";

export class SqliteAdapter implements EvaliteAdapter {
  private db: BetterSqlite3.Database;

  private constructor(db: BetterSqlite3.Database) {
    this.db = db;
  }

  /**
   * Create a new SQLite adapter
   */
  static create(location: string): SqliteAdapter {
    const db = createSqliteDatabase(location);
    return new SqliteAdapter(db);
  }

  runs = {
    create: async (
      opts: Evalite.Adapter.Runs.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Run> => {
      return dbCreateRun({ db: this.db, runType: opts.runType });
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
      return dbCreateEvalIfNotExists({
        db: this.db,
        ...opts,
      });
    },

    update: async (
      opts: Evalite.Adapter.Evals.UpdateOpts
    ): Promise<Evalite.Adapter.Entities.Eval> => {
      return dbUpdateEvalStatusAndDuration({
        db: this.db,
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

    getAverageScores: async (
      opts: Evalite.Adapter.Evals.GetAverageScoresOpts
    ): Promise<Array<{ eval_id: number; average: number }>> => {
      return dbGetEvalsAverageScores(this.db, opts.ids);
    },
  };

  results = {
    create: async (
      opts: Evalite.Adapter.Results.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Result> => {
      return dbInsertResult({
        db: this.db,
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
      return dbUpdateResult({
        db: this.db,
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

    getAverageScores: async (
      opts: Evalite.Adapter.Results.GetAverageScoresOpts
    ): Promise<Array<{ result_id: number; average: number }>> => {
      return dbGetAverageScoresFromResults(this.db, opts.ids);
    },
  };

  scores = {
    create: async (
      opts: Evalite.Adapter.Scores.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Score> => {
      return dbInsertScore({
        db: this.db,
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
      return dbInsertTrace({
        db: this.db,
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
 * @param location - Path to the SQLite database file
 * @returns A new SqliteAdapter instance
 */
export const createSqliteAdapter = (location: string): SqliteAdapter => {
  return SqliteAdapter.create(location);
};

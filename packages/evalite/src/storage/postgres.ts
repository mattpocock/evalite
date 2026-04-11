import type { Evalite } from "../types.js";
import type postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

// postgres.js JSONValue type for sql.json() calls
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

type PostgresStorageOpts = {
  /** Postgres schema to use (default: 'evals') */
  schema?: string;
  /** Table name for evaluations (default: 'evaluations') */
  evaluationsTable?: string;
  /** Host to connect to (alternative to connection string) */
  host?: string;
  /** Port to connect to (default: 5432) */
  port?: number;
  /** Database name */
  database?: string;
  /** Database user */
  user?: string;
  /** Database password */
  password?: string;
  /** Enable SSL connection */
  ssl?: boolean | "require" | "prefer";
  /** Maximum number of connections in the pool */
  maxConnections?: number;
};

export class PostgresStorage implements Evalite.Storage {
  private sql: Sql;
  private schema: string;
  private evalsTable: string;

  private constructor(sql: Sql, opts?: PostgresStorageOpts) {
    this.sql = sql;
    this.schema = opts?.schema ?? "evals";
    this.evalsTable = opts?.evaluationsTable ?? "evaluations";
  }

  static async create(
    sql: Sql,
    opts?: PostgresStorageOpts
  ): Promise<PostgresStorage> {
    const schema = opts?.schema ?? "evals";
    await sql.unsafe(`SET search_path TO ${schema}, public`);
    return new PostgresStorage(sql, opts);
  }

  private toISOString(val: unknown): string {
    if (val instanceof Date) return val.toISOString();
    return String(val);
  }

  private json(val: unknown): ReturnType<Sql["json"]> | null {
    if (val === undefined || val === null) return null;
    return this.sql.json(val as JSONValue);
  }

  private mapRunRow(
    row: Record<string, unknown>
  ): Evalite.Storage.Entities.Run {
    return {
      id: Number(row.id),
      runType: row.run_type as Evalite.RunType,
      created_at: this.toISOString(row.created_at),
    };
  }

  private mapEvalRow(
    row: Record<string, unknown>
  ): Evalite.Storage.Entities.Eval {
    return {
      id: Number(row.id),
      run_id: Number(row.run_id),
      name: row.name as string,
      filepath: row.filepath as string,
      status: row.status as Evalite.Storage.Entities.EvalStatus,
      duration: Number(row.duration),
      created_at: this.toISOString(row.created_at),
      variant_name: row.variant_name as string | undefined,
      variant_group: row.variant_group as string | undefined,
    };
  }

  private mapResultRow(
    row: Record<string, unknown>
  ): Evalite.Storage.Entities.Result {
    return {
      id: Number(row.id),
      eval_id: Number(row.eval_id),
      duration: Number(row.duration),
      input: row.input,
      output: row.output,
      expected: row.expected,
      created_at: this.toISOString(row.created_at),
      col_order: Number(row.col_order),
      status: row.status as Evalite.ResultStatus,
      rendered_columns: row.rendered_columns,
      trial_index: row.trial_index != null ? Number(row.trial_index) : null,
    };
  }

  private mapScoreRow(
    row: Record<string, unknown>
  ): Evalite.Storage.Entities.Score {
    return {
      id: Number(row.id),
      result_id: Number(row.result_id),
      name: row.name as string,
      score: Number(row.score),
      description: row.description as string | undefined,
      metadata: row.metadata,
      created_at: this.toISOString(row.created_at),
    };
  }

  private mapTraceRow(
    row: Record<string, unknown>
  ): Evalite.Storage.Entities.Trace {
    return {
      id: Number(row.id),
      result_id: Number(row.result_id),
      input: row.input,
      output: row.output,
      start_time: Number(row.start_time),
      end_time: Number(row.end_time),
      input_tokens:
        row.input_tokens != null ? Number(row.input_tokens) : undefined,
      output_tokens:
        row.output_tokens != null ? Number(row.output_tokens) : undefined,
      total_tokens:
        row.total_tokens != null ? Number(row.total_tokens) : undefined,
      col_order: Number(row.col_order),
    };
  }

  runs = {
    create: async (
      opts: Evalite.Storage.Runs.CreateOpts
    ): Promise<Evalite.Storage.Entities.Run> => {
      const [row] = await this.sql`
        INSERT INTO runs (run_type)
        VALUES (${opts.runType})
        RETURNING *
      `;
      return this.mapRunRow(row!);
    },

    getMany: async (
      opts?: Evalite.Storage.Runs.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Run[]> => {
      const conditions: string[] = ["1=1"];
      const values: (string | number)[] = [];
      let paramIdx = 0;

      if (opts?.ids && opts.ids.length > 0) {
        conditions.push(
          `id IN (${opts.ids.map(() => `$${++paramIdx}`).join(",")})`
        );
        values.push(...opts.ids);
      }

      if (opts?.runType) {
        conditions.push(`run_type = $${++paramIdx}`);
        values.push(opts.runType);
      }

      if (opts?.createdAt) {
        conditions.push(`created_at = $${++paramIdx}`);
        values.push(opts.createdAt);
      }

      if (opts?.createdAfter) {
        conditions.push(`created_at > $${++paramIdx}`);
        values.push(opts.createdAfter);
      }

      if (opts?.createdBefore) {
        conditions.push(`created_at < $${++paramIdx}`);
        values.push(opts.createdBefore);
      }

      const orderBy = opts?.orderBy ?? "created_at";
      const orderDir = opts?.orderDirection ?? "DESC";
      const limitClause = opts?.limit ? `LIMIT ${opts.limit}` : "";

      const rows = await this.sql.unsafe(
        `SELECT * FROM runs WHERE ${conditions.join(" AND ")} ORDER BY ${orderBy} ${orderDir} ${limitClause}`,
        values as never[]
      );

      return rows.map((r) => this.mapRunRow(r));
    },
  };

  evals = {
    create: async (
      opts: Evalite.Storage.Evals.CreateOpts
    ): Promise<Evalite.Storage.Entities.Eval> => {
      const [row] = await this.sql`
        INSERT INTO ${this.sql(this.evalsTable)} (run_id, name, filepath, duration, status, variant_name, variant_group)
        VALUES (${opts.runId}, ${opts.name}, ${opts.filepath}, ${0}, ${"running"}, ${opts.variantName ?? null}, ${opts.variantGroup ?? null})
        RETURNING *
      `;
      return this.mapEvalRow(row!);
    },

    update: async (
      opts: Evalite.Storage.Evals.UpdateOpts
    ): Promise<Evalite.Storage.Entities.Eval> => {
      const [row] = await this.sql`
        UPDATE ${this.sql(this.evalsTable)}
        SET status = ${opts.status}
        WHERE id = ${opts.id}
        RETURNING *
      `;
      return this.mapEvalRow(row!);
    },

    getMany: async (
      opts?: Evalite.Storage.Evals.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Eval[]> => {
      const table = this.evalsTable;
      const conditions: string[] = ["1=1"];
      const values: (string | number)[] = [];
      let paramIdx = 0;

      if (opts?.ids && opts.ids.length > 0) {
        conditions.push(
          `id IN (${opts.ids.map(() => `$${++paramIdx}`).join(",")})`
        );
        values.push(...opts.ids);
      }

      if (opts?.runIds && opts.runIds.length > 0) {
        conditions.push(
          `run_id IN (${opts.runIds.map(() => `$${++paramIdx}`).join(",")})`
        );
        values.push(...opts.runIds);
      }

      if (opts?.name) {
        conditions.push(`name = $${++paramIdx}`);
        values.push(opts.name);
      }

      if (opts?.statuses && opts.statuses.length > 0) {
        conditions.push(
          `status IN (${opts.statuses.map(() => `$${++paramIdx}`).join(",")})`
        );
        values.push(...opts.statuses);
      }

      if (opts?.createdAt) {
        conditions.push(`created_at = $${++paramIdx}`);
        values.push(opts.createdAt);
      }

      if (opts?.createdAfter) {
        conditions.push(`created_at > $${++paramIdx}`);
        values.push(opts.createdAfter);
      }

      if (opts?.createdBefore) {
        conditions.push(`created_at < $${++paramIdx}`);
        values.push(opts.createdBefore);
      }

      const orderBy = opts?.orderBy ?? "created_at";
      const orderDir = opts?.orderDirection ?? "DESC";
      const limitClause = opts?.limit ? `LIMIT ${opts.limit}` : "";

      const rows = await this.sql.unsafe(
        `SELECT * FROM "${table}" WHERE ${conditions.join(" AND ")} ORDER BY ${orderBy} ${orderDir} ${limitClause}`,
        values as never[]
      );

      return rows.map((r) => this.mapEvalRow(r));
    },
  };

  results = {
    create: async (
      opts: Evalite.Storage.Results.CreateOpts
    ): Promise<Evalite.Storage.Entities.Result> => {
      const [row] = await this.sql`
        INSERT INTO results (eval_id, col_order, input, expected, output, duration, status, rendered_columns, trial_index)
        VALUES (
          ${opts.evalId},
          ${opts.order},
          ${this.json(opts.input)},
          ${this.json(opts.expected)},
          ${this.json(opts.output)},
          ${opts.duration},
          ${opts.status},
          ${this.json(opts.renderedColumns)},
          ${opts.trialIndex ?? null}
        )
        RETURNING *
      `;
      return this.mapResultRow(row!);
    },

    update: async (
      opts: Evalite.Storage.Results.UpdateOpts
    ): Promise<Evalite.Storage.Entities.Result> => {
      const [row] = await this.sql`
        UPDATE results
        SET
          output = ${this.json(opts.output)},
          duration = ${opts.duration},
          input = ${this.json(opts.input)},
          expected = ${this.json(opts.expected)},
          status = ${opts.status},
          rendered_columns = ${this.json(opts.renderedColumns)},
          trial_index = ${opts.trialIndex ?? null}
        WHERE id = ${opts.id}
        RETURNING *
      `;
      return this.mapResultRow(row!);
    },

    getMany: async (
      opts?: Evalite.Storage.Results.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Result[]> => {
      const conditions: string[] = ["1=1"];
      const values: (string | number)[] = [];
      let paramIdx = 0;

      if (opts?.ids && opts.ids.length > 0) {
        conditions.push(
          `id IN (${opts.ids.map(() => `$${++paramIdx}`).join(",")})`
        );
        values.push(...opts.ids);
      }

      if (opts?.evalIds && opts.evalIds.length > 0) {
        conditions.push(
          `eval_id IN (${opts.evalIds.map(() => `$${++paramIdx}`).join(",")})`
        );
        values.push(...opts.evalIds);
      }

      if (opts?.order !== undefined) {
        conditions.push(`col_order = $${++paramIdx}`);
        values.push(opts.order);
      }

      if (opts?.statuses && opts.statuses.length > 0) {
        conditions.push(
          `status IN (${opts.statuses.map(() => `$${++paramIdx}`).join(",")})`
        );
        values.push(...opts.statuses);
      }

      const rows = await this.sql.unsafe(
        `SELECT * FROM results WHERE ${conditions.join(" AND ")} ORDER BY col_order ASC`,
        values as never[]
      );

      return rows.map((r) => this.mapResultRow(r));
    },
  };

  scores = {
    create: async (
      opts: Evalite.Storage.Scores.CreateOpts
    ): Promise<Evalite.Storage.Entities.Score> => {
      const [row] = await this.sql`
        INSERT INTO scores (result_id, name, score, description, metadata)
        VALUES (${opts.resultId}, ${opts.name}, ${opts.score}, ${opts.description ?? null}, ${this.json(opts.metadata)})
        RETURNING *
      `;
      return this.mapScoreRow(row!);
    },

    getMany: async (
      opts?: Evalite.Storage.Scores.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Score[]> => {
      const conditions: string[] = ["1=1"];
      const values: (string | number)[] = [];
      let paramIdx = 0;

      if (opts?.ids && opts.ids.length > 0) {
        conditions.push(
          `id IN (${opts.ids.map(() => `$${++paramIdx}`).join(",")})`
        );
        values.push(...opts.ids);
      }

      if (opts?.resultIds && opts.resultIds.length > 0) {
        conditions.push(
          `result_id IN (${opts.resultIds.map(() => `$${++paramIdx}`).join(",")})`
        );
        values.push(...opts.resultIds);
      }

      const rows = await this.sql.unsafe(
        `SELECT * FROM scores WHERE ${conditions.join(" AND ")}`,
        values as never[]
      );

      return rows.map((r) => this.mapScoreRow(r));
    },
  };

  traces = {
    create: async (
      opts: Evalite.Storage.Traces.CreateOpts
    ): Promise<Evalite.Storage.Entities.Trace> => {
      const [row] = await this.sql`
        INSERT INTO traces (result_id, input, output, start_time, end_time, input_tokens, output_tokens, total_tokens, col_order)
        VALUES (
          ${opts.resultId},
          ${this.json(opts.input)},
          ${this.json(opts.output)},
          ${Math.round(opts.start)},
          ${Math.round(opts.end)},
          ${opts.inputTokens ?? null},
          ${opts.outputTokens ?? null},
          ${opts.totalTokens ?? null},
          ${opts.order}
        )
        RETURNING *
      `;
      return this.mapTraceRow(row!);
    },

    getMany: async (
      opts?: Evalite.Storage.Traces.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Trace[]> => {
      const conditions: string[] = ["1=1"];
      const values: (string | number)[] = [];
      let paramIdx = 0;

      if (opts?.ids && opts.ids.length > 0) {
        conditions.push(
          `id IN (${opts.ids.map(() => `$${++paramIdx}`).join(",")})`
        );
        values.push(...opts.ids);
      }

      if (opts?.resultIds && opts.resultIds.length > 0) {
        conditions.push(
          `result_id IN (${opts.resultIds.map(() => `$${++paramIdx}`).join(",")})`
        );
        values.push(...opts.resultIds);
      }

      const rows = await this.sql.unsafe(
        `SELECT * FROM traces WHERE ${conditions.join(" AND ")} ORDER BY col_order ASC`,
        values as never[]
      );

      return rows.map((r) => this.mapTraceRow(r));
    },
  };

  async close(): Promise<void> {
    await this.sql.end();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

/**
 * Create a new Postgres storage backend for evalite.
 *
 * Accepts either a connection string or individual connection parameters via opts.
 *
 * @param connectionStringOrOpts - Postgres connection string, or opts object with connection params
 * @param opts - Optional configuration when using a connection string
 * @returns A new PostgresStorage instance
 *
 * @example Connection string
 * ```ts
 * import { createPostgresStorage } from "evalite/postgres-storage";
 *
 * export default defineConfig({
 *   storage: () => createPostgresStorage(process.env.DATABASE_URL!, {
 *     schema: "evals",
 *   }),
 * });
 * ```
 *
 * @example Individual parameters
 * ```ts
 * import { createPostgresStorage } from "evalite/postgres-storage";
 *
 * export default defineConfig({
 *   storage: () => createPostgresStorage({
 *     host: "db.example.com",
 *     port: 5432,
 *     database: "mydb",
 *     user: "postgres",
 *     password: "secret",
 *     ssl: "require",
 *     maxConnections: 10,
 *     schema: "evals",
 *   }),
 * });
 * ```
 */
export const createPostgresStorage = async (
  connectionStringOrOpts: string | PostgresStorageOpts,
  opts?: PostgresStorageOpts
): Promise<PostgresStorage> => {
  const pgModule = await import("postgres");
  const pg = pgModule.default;

  const resolvedOpts =
    typeof connectionStringOrOpts === "string" ? opts : connectionStringOrOpts;
  const schema = resolvedOpts?.schema ?? "evals";
  const pgOpts: Record<string, unknown> = {
    connection: { search_path: `${schema},public` },
  };

  if (resolvedOpts?.maxConnections) {
    pgOpts.max = resolvedOpts.maxConnections;
  }
  if (resolvedOpts?.ssl !== undefined) {
    pgOpts.ssl = resolvedOpts.ssl;
  }

  let sql: Sql;
  if (typeof connectionStringOrOpts === "string") {
    sql = pg(connectionStringOrOpts, pgOpts);
  } else {
    // Build a connection string from individual params
    const host = resolvedOpts?.host ?? "localhost";
    const port = resolvedOpts?.port ?? 5432;
    const user = resolvedOpts?.user ?? "postgres";
    const password = resolvedOpts?.password;
    const database = resolvedOpts?.database ?? "postgres";
    const auth = password ? `${user}:${password}` : user;
    const connString = `postgresql://${auth}@${host}:${port}/${database}`;
    sql = pg(connString, pgOpts);
  }

  return PostgresStorage.create(sql, resolvedOpts);
};

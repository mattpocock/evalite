import type { Evalite } from "../types.js";

/**
 * Storage interface for storage backends in Evalite.
 * Implement this interface to create custom storage backends (e.g., Postgres, Turso, in-memory).
 */
export interface EvaliteStorage {
  /**
   * Operations for managing test runs.
   */
  runs: {
    /**
     * Create a new run and return the complete run entity.
     */
    create(
      opts: Evalite.Storage.Runs.CreateOpts
    ): Promise<Evalite.Storage.Entities.Run>;

    /**
     * Get runs matching the specified criteria.
     */
    getMany(
      opts?: Evalite.Storage.Runs.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Run[]>;
  };

  /**
   * Operations for managing evaluations.
   */
  evals: {
    /**
     * Create a new eval and return the complete eval entity.
     */
    create(
      opts: Evalite.Storage.Evals.CreateOpts
    ): Promise<Evalite.Storage.Entities.Eval>;

    /**
     * Update an eval and return the updated entity.
     */
    update(
      opts: Evalite.Storage.Evals.UpdateOpts
    ): Promise<Evalite.Storage.Entities.Eval>;

    /**
     * Get evals matching the specified criteria.
     */
    getMany(
      opts?: Evalite.Storage.Evals.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Eval[]>;
  };

  /**
   * Operations for managing test results.
   */
  results: {
    /**
     * Create a new result and return the complete result entity.
     */
    create(
      opts: Evalite.Storage.Results.CreateOpts
    ): Promise<Evalite.Storage.Entities.Result>;

    /**
     * Update a result and return the updated entity.
     */
    update(
      opts: Evalite.Storage.Results.UpdateOpts
    ): Promise<Evalite.Storage.Entities.Result>;

    /**
     * Get results matching the specified criteria.
     */
    getMany(
      opts?: Evalite.Storage.Results.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Result[]>;
  };

  /**
   * Operations for managing scores.
   */
  scores: {
    /**
     * Create a new score and return the complete score entity.
     */
    create(
      opts: Evalite.Storage.Scores.CreateOpts
    ): Promise<Evalite.Storage.Entities.Score>;

    /**
     * Get scores matching the specified criteria.
     */
    getMany(
      opts?: Evalite.Storage.Scores.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Score[]>;
  };

  /**
   * Operations for managing traces.
   */
  traces: {
    /**
     * Create a new trace and return the complete trace entity.
     */
    create(
      opts: Evalite.Storage.Traces.CreateOpts
    ): Promise<Evalite.Storage.Entities.Trace>;

    /**
     * Get traces matching the specified criteria.
     */
    getMany(
      opts?: Evalite.Storage.Traces.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Trace[]>;
  };

  /**
   * Close/cleanup the storage (e.g., close database connection).
   */
  close(): Promise<void>;

  /**
   * Symbol.asyncDispose for use with `await using` syntax.
   */
  [Symbol.asyncDispose](): Promise<void>;
}

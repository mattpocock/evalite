import type { Evalite } from "../types.js";

/**
 * New namespaced adapter interface for storage backends in Evalite.
 * Implement this interface to create custom storage adapters (e.g., Postgres, Turso, in-memory).
 */
export interface EvaliteAdapter {
  /**
   * Operations for managing test runs.
   */
  runs: {
    /**
     * Create a new run and return the complete run entity.
     */
    create(
      opts: Evalite.Adapter.Runs.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Run>;

    /**
     * Get runs matching the specified criteria.
     */
    getMany(
      opts?: Evalite.Adapter.Runs.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Run[]>;
  };

  /**
   * Operations for managing evaluations.
   */
  evals: {
    /**
     * Create or get an existing eval and return the complete eval entity.
     */
    createOrGet(
      opts: Evalite.Adapter.Evals.CreateOrGetOpts
    ): Promise<Evalite.Adapter.Entities.Eval>;

    /**
     * Update an eval and return the updated entity.
     */
    update(
      opts: Evalite.Adapter.Evals.UpdateOpts
    ): Promise<Evalite.Adapter.Entities.Eval>;

    /**
     * Get evals matching the specified criteria.
     */
    getMany(
      opts?: Evalite.Adapter.Evals.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Eval[]>;
  };

  /**
   * Operations for managing test results.
   */
  results: {
    /**
     * Create a new result and return the complete result entity.
     */
    create(
      opts: Evalite.Adapter.Results.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Result>;

    /**
     * Update a result and return the updated entity.
     */
    update(
      opts: Evalite.Adapter.Results.UpdateOpts
    ): Promise<Evalite.Adapter.Entities.Result>;

    /**
     * Get results matching the specified criteria.
     */
    getMany(
      opts?: Evalite.Adapter.Results.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Result[]>;

    /**
     * Get average scores for the specified results.
     */
    getAverageScores(
      opts: Evalite.Adapter.Results.GetAverageScoresOpts
    ): Promise<Array<{ result_id: number; average: number }>>;
  };

  /**
   * Operations for managing scores.
   */
  scores: {
    /**
     * Create a new score and return the complete score entity.
     */
    create(
      opts: Evalite.Adapter.Scores.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Score>;

    /**
     * Get scores matching the specified criteria.
     */
    getMany(
      opts?: Evalite.Adapter.Scores.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Score[]>;
  };

  /**
   * Operations for managing traces.
   */
  traces: {
    /**
     * Create a new trace and return the complete trace entity.
     */
    create(
      opts: Evalite.Adapter.Traces.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Trace>;

    /**
     * Get traces matching the specified criteria.
     */
    getMany(
      opts?: Evalite.Adapter.Traces.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Trace[]>;
  };

  /**
   * Close/cleanup the adapter (e.g., close database connection).
   */
  close(): Promise<void>;

  /**
   * Symbol.asyncDispose for use with `await using` syntax.
   */
  [Symbol.asyncDispose](): Promise<void>;
}

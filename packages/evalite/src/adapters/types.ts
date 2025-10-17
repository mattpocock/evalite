import type { Evalite } from "../types.js";

/**
 * Abstract interface for storage backends in Evalite.
 * Implement this interface to create custom storage adapters (e.g., Postgres, Turso, in-memory).
 *
 * @deprecated - This is the legacy adapter interface. It will be replaced by the new namespaced interface.
 * For now, both interfaces are supported for backwards compatibility.
 */
export interface EvaliteAdapterLegacy {
  /**
   * Create a new run and return its ID.
   */
  createRun(runType: Evalite.RunType): number | bigint;

  /**
   * Create or get an existing eval and return its ID.
   */
  createEvalIfNotExists(opts: {
    runId: number | bigint;
    name: string;
    filepath: string;
    variantName?: string;
    variantGroup?: string;
  }): number | bigint;

  /**
   * Insert a new result for an eval.
   */
  insertResult(opts: {
    evalId: number | bigint;
    order: number;
    input: unknown;
    expected: unknown;
    output: unknown;
    duration: number;
    status: string;
    renderedColumns: unknown;
  }): number | bigint;

  /**
   * Update an existing result.
   */
  updateResult(opts: {
    resultId: number | bigint;
    output: unknown;
    duration: number;
    input: unknown;
    expected: unknown;
    status: string;
    renderedColumns: unknown;
  }): void;

  /**
   * Insert a score for a result.
   */
  insertScore(opts: {
    resultId: number | bigint;
    name: string;
    score: number;
    description?: string;
    metadata: unknown;
  }): void;

  /**
   * Insert a trace for a result.
   */
  insertTrace(opts: {
    resultId: number | bigint;
    input: unknown;
    output: unknown;
    start: number;
    end: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    order: number;
  }): void;

  /**
   * Update eval status and duration.
   */
  updateEvalStatusAndDuration(opts: {
    evalId: number | bigint;
    status: Evalite.Adapter.Entities.EvalStatus;
  }): void;

  /**
   * Get evals for specific runs and statuses.
   */
  getEvals(
    runIds: number[],
    allowedStatuses: Evalite.Adapter.Entities.EvalStatus[]
  ): Evalite.Adapter.Entities.Eval[];

  /**
   * Get results for specific evals.
   */
  getResults(evalIds: number[]): Evalite.Adapter.Entities.Result[];

  /**
   * Get scores for specific results.
   */
  getScores(resultIds: number[]): Evalite.Adapter.Entities.Score[];

  /**
   * Get traces for specific results.
   */
  getTraces(resultIds: number[]): Evalite.Adapter.Entities.Trace[];

  /**
   * Get the most recent run of a specific type.
   */
  getMostRecentRun(
    runType: Evalite.RunType
  ): Evalite.Adapter.Entities.Run | undefined;

  /**
   * Get the previous completed eval by name.
   */
  getPreviousCompletedEval(
    name: string,
    startTime: string
  ): Evalite.Adapter.Entities.Eval | undefined;

  /**
   * Get average scores for specific results.
   */
  getAverageScoresFromResults(
    resultIds: number[]
  ): { result_id: number; average: number }[];

  /**
   * Get average scores for specific evals.
   */
  getEvalsAverageScores(
    evalIds: number[]
  ): { eval_id: number; average: number }[];

  /**
   * Get a single eval by name.
   */
  getEvalByName(opts: {
    name: string;
    timestamp?: string;
    statuses?: Evalite.Adapter.Entities.EvalStatus[];
  }): Evalite.Adapter.Entities.Eval | undefined;

  /**
   * Get historical evals with scores by name.
   */
  getHistoricalEvalsWithScoresByName(
    name: string
  ): (Evalite.Adapter.Entities.Eval & { average_score: number })[];

  /**
   * Find result by eval ID and order.
   */
  findResultByEvalIdAndOrder(opts: {
    evalId: number | bigint;
    order: number;
  }): number | undefined;

  /**
   * Get all results for a specific eval.
   */
  getAllResultsForEval(evalId: number | bigint): Array<{
    id: number;
    status: Evalite.ResultStatus;
  }>;

  /**
   * Get all evals as a record (deprecated but needed for compatibility).
   */
  getEvalsAsRecord(): Promise<Record<string, any[]>>;

  /**
   * Close/cleanup the adapter (e.g., close database connection).
   */
  close(): Promise<void>;
}

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

    /**
     * Get average scores for the specified evals.
     */
    getAverageScores(
      opts: Evalite.Adapter.Evals.GetAverageScoresOpts
    ): Promise<Array<{ eval_id: number; average: number }>>;
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
}

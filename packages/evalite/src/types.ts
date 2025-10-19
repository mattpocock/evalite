export declare namespace Evalite {
  /**
   * Configuration options for Evalite
   */
  export interface Config {
    /**
     * Factory function to create a custom storage backend.
     * Can be async if the storage requires async initialization.
     *
     * @example
     * ```ts
     * import { createSqliteStorage } from "evalite/sqlite-storage"
     *
     * export default defineConfig({
     *   storage: () => createSqliteStorage("./custom.db")
     * })
     * ```
     */
    storage?: () => Evalite.Storage | Promise<Evalite.Storage>;

    /**
     * Server configuration options
     */
    server?: {
      /**
       * Port for the Evalite UI server
       * @default 3006
       */
      port?: number;
    };

    /**
     * Minimum average score threshold (0-100).
     * If the average score falls below this threshold, the process will exit with code 1.
     *
     * @example
     * ```ts
     * export default defineConfig({
     *   scoreThreshold: 80 // Fail if average score < 80
     * })
     * ```
     */
    scoreThreshold?: number;

    /**
     * Hide the results table in terminal output
     * @default false
     */
    hideTable?: boolean;

    /**
     * Maximum time (in milliseconds) a test can run before timing out
     * @default 30000
     * @example
     * ```ts
     * export default defineConfig({
     *   testTimeout: 60000 // 60 seconds
     * })
     * ```
     */
    testTimeout?: number;

    /**
     * Maximum number of test cases to run in parallel
     * @default 5
     * @example
     * ```ts
     * export default defineConfig({
     *   maxConcurrency: 100 // Run up to 100 tests in parallel
     * })
     * ```
     */
    maxConcurrency?: number;

    /**
     * Number of times to run each test case for non-deterministic evaluations
     * @default 1
     * @example
     * ```ts
     * export default defineConfig({
     *   trialCount: 3 // Run each test case 3 times
     * })
     * ```
     */
    trialCount?: number;

    /**
     * Setup files to run before tests (e.g., for loading environment variables)
     * @example
     * ```ts
     * export default defineConfig({
     *   setupFiles: ["dotenv/config"]
     * })
     * ```
     */
    setupFiles?: string[];
  }

  export type RunType = "full" | "partial";

  export type RunningServerState = {
    type: "running";
    runType: RunType;
    filepaths: string[];
    runId: number | bigint | undefined;
    evalNamesRunning: string[];
    resultIdsRunning: (number | bigint)[];
  };

  export type ServerState =
    | RunningServerState
    | {
        type: "idle";
      };

  export type MaybePromise<T> = T | Promise<T>;

  export interface InitialResult {
    evalName: string;
    filepath: string;
    order: number;
    status: ResultStatus;
    variantName: string | undefined;
    variantGroup: string | undefined;
    trialIndex: number | undefined;
  }

  export type ResultStatus = "success" | "fail" | "running";

  export type RenderedColumn = {
    label: string;
    value: unknown;
  };

  export interface Result {
    evalName: string;
    filepath: string;
    order: number;
    status: ResultStatus;
    variantName: string | undefined;
    variantGroup: string | undefined;
    trialIndex: number | undefined;
    /**
     * Technically, input and expected are known at the start
     * of the evaluation. But because they may be files, they
     * need to be saved asynchronously.
     *
     * This is why they are only included in the final result.
     */
    input: unknown;
    expected?: unknown;
    output: unknown;
    scores: Score[];
    duration: number;
    traces: Trace[];
    renderedColumns: RenderedColumn[];
  }

  export type Score = {
    /**
     * A number between 0 and 1.
     *
     * Added null for compatibility with {@link https://github.com/braintrustdata/autoevals | autoevals}.
     * null scores will be reported as 0.
     */
    score: number | null;
    name: string;
    description?: string;
    metadata?: unknown;
  };

  export type UserProvidedScoreWithMetadata = {
    score: number;
    metadata?: unknown;
  };

  export type ScoreInput<TInput, TOutput, TExpected> = {
    input: TInput;
    output: TOutput;
    expected?: TExpected;
  };

  export type Task<TInput, TOutput, TVariant = undefined> = (
    input: TInput,
    variant: TVariant
  ) => MaybePromise<TOutput | AsyncIterable<TOutput>>;

  export type Scorer<TInput, TOutput, TExpected> = (
    opts: ScoreInput<TInput, TOutput, TExpected>
  ) => MaybePromise<Score>;

  export type RunnerOpts<TInput, TOutput, TExpected, TVariant = undefined> = {
    data:
      | { input: TInput; expected?: TExpected; only?: boolean }[]
      | (() => MaybePromise<
          { input: TInput; expected?: TExpected; only?: boolean }[]
        >);
    task: Task<TInput, TOutput, TVariant>;
    scorers?: Array<
      | Scorer<TInput, TOutput, TExpected>
      | ScorerOpts<TInput, TOutput, TExpected>
    >;
    /**
     * @deprecated Use `columns` instead.
     */
    experimental_customColumns?: (
      opts: ScoreInput<TInput, TOutput, TExpected>
    ) => MaybePromise<RenderedColumn[]>;
    columns?: (
      opts: ScoreInput<TInput, TOutput, TExpected>
    ) => MaybePromise<RenderedColumn[]>;
    /**
     * Number of times to run each test case for non-deterministic evaluations
     * @default 1
     * @example
     * ```ts
     * evalite("My Eval", {
     *   data: [...],
     *   task: ...,
     *   trialCount: 5 // Run each data point 5 times
     * })
     * ```
     */
    trialCount?: number;
  };

  export type ScorerOpts<TInput, TOutput, TExpected> = {
    name: string;
    description?: string;
    scorer: (
      input: Evalite.ScoreInput<TInput, TOutput, TExpected>
    ) => Evalite.MaybePromise<number | Evalite.UserProvidedScoreWithMetadata>;
  };

  export interface Trace {
    input: unknown;
    usage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    output: unknown;
    start: number;
    end: number;
  }

  export type TracePrompt = {
    role: string;
    content: TracePromptTextContent[] | string;
  };

  export type TracePromptTextContent = {
    type: "text";
    text: string;
  };

  export type File = {
    __EvaliteFile: true;
    path: string;
  };

  export namespace SDK {
    export type GetEvalByNameResult = {
      history: {
        score: number;
        date: string;
      }[];
      evaluation: Evalite.Storage.Entities.Eval & {
        results: (Evalite.Storage.Entities.Result & {
          scores: Evalite.Storage.Entities.Score[];
        })[];
      };
      prevEvaluation:
        | (Evalite.Storage.Entities.Eval & {
            results: (Evalite.Storage.Entities.Result & {
              scores: Evalite.Storage.Entities.Score[];
            })[];
          })
        | undefined;
    };

    export type GetMenuItemsResultEval = {
      filepath: string;
      score: number;
      name: string;
      prevScore: number | undefined;
      evalStatus: Evalite.Storage.Entities.EvalStatus;
      variantName: string | undefined;
      variantGroup: string | undefined;
      hasScores: boolean;
    };

    export type GetMenuItemsResult = {
      evals: GetMenuItemsResultEval[];
      score: number;
      prevScore: number | undefined;
      evalStatus: Evalite.Storage.Entities.EvalStatus;
    };

    export type GetResultResult = {
      result: Evalite.Storage.Entities.Result & {
        traces: Evalite.Storage.Entities.Trace[];
        score: number;
        scores: Evalite.Storage.Entities.Score[];
      };
      prevResult:
        | (Evalite.Storage.Entities.Result & {
            score: number;
            scores: Evalite.Storage.Entities.Score[];
          })
        | undefined;
      evaluation: Evalite.Storage.Entities.Eval;
    };
  }

  /**
   * Storage interface for storage backends in Evalite.
   * Implement this interface to create custom storage backends (e.g., Postgres, Turso, in-memory).
   */
  export interface Storage {
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

  /**
   * Types for the Storage API.
   * These types define the interface for pluggable storage backends.
   */
  export namespace Storage {
    // ========== ENTITIES ==========
    /**
     * Database entity types that storage backends must return.
     * These are the canonical types for the storage contract.
     */
    export namespace Entities {
      export type Run = {
        id: number;
        runType: RunType;
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
        status: ResultStatus;
        rendered_columns?: unknown;
        trial_index?: number | null;
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

    // ========== RUNS ==========
    export namespace Runs {
      export interface CreateOpts {
        runType: RunType;
      }

      export interface GetManyOpts {
        ids?: number[];
        runType?: RunType;
        createdAfter?: string;
        createdBefore?: string;
        createdAt?: string;
        limit?: number;
        orderBy?: "created_at" | "id";
        orderDirection?: "asc" | "desc";
      }
    }

    // ========== EVALS ==========
    export namespace Evals {
      export interface CreateOpts {
        runId: number;
        name: string;
        filepath: string;
        variantName?: string;
        variantGroup?: string;
      }

      export interface UpdateOpts {
        id: number;
        status: Entities.EvalStatus;
      }

      export interface GetManyOpts {
        ids?: number[];
        runIds?: number[];
        name?: string;
        statuses?: Entities.EvalStatus[];
        createdAt?: string;
        createdAfter?: string;
        createdBefore?: string;
        limit?: number;
        orderBy?: "created_at" | "name" | "id";
        orderDirection?: "asc" | "desc";
      }
    }

    // ========== RESULTS ==========
    export namespace Results {
      export interface CreateOpts {
        evalId: number;
        order: number;
        input: unknown;
        expected: unknown;
        output: unknown;
        duration: number;
        status: ResultStatus;
        renderedColumns: unknown;
        trialIndex?: number;
      }

      export interface UpdateOpts {
        id: number;
        output: unknown;
        duration: number;
        input: unknown;
        expected: unknown;
        status: ResultStatus;
        renderedColumns: unknown;
        trialIndex?: number;
      }

      export interface GetManyOpts {
        ids?: number[];
        evalIds?: number[];
        order?: number;
        statuses?: ResultStatus[];
      }
    }

    // ========== SCORES ==========
    export namespace Scores {
      export interface CreateOpts {
        resultId: number;
        name: string;
        score: number;
        description?: string;
        metadata: unknown;
      }

      export interface GetManyOpts {
        ids?: number[];
        resultIds?: number[];
      }
    }

    // ========== TRACES ==========
    export namespace Traces {
      export interface CreateOpts {
        resultId: number;
        input: unknown;
        output: unknown;
        start: number;
        end: number;
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
        order: number;
      }

      export interface GetManyOpts {
        ids?: number[];
        resultIds?: number[];
      }
    }
  }

  /**
   * Types for the exported evaluation output format.
   * These types represent the structure of JSON files created by the --outputPath flag.
   */
  export namespace Exported {
    /** Metadata about a test run */
    export type Run = {
      /** Unique identifier for this run */
      id: number;
      /** Type of run: "full" runs all tests, "partial" runs only changed tests */
      runType: "full" | "partial";
      /** ISO 8601 timestamp when the run was created */
      createdAt: string;
    };

    /** Score from a scorer function */
    export type Score = {
      /** Unique identifier for this score */
      id: number;
      /** Name of the scorer that produced this score */
      name: string;
      /** The score value (0-1 scale, where 1 is best) */
      score: number;
      /** Optional human-readable description of what this score measures */
      description?: string;
      /** Optional additional data attached to this score by the scorer */
      metadata?: unknown;
      /** ISO 8601 timestamp when the score was created */
      createdAt: string;
    };

    /** Trace of an LLM call (for debugging and cost tracking) */
    export type Trace = {
      /** Unique identifier for this trace */
      id: number;
      /** The input/prompt sent to the LLM */
      input: unknown;
      /** The response received from the LLM */
      output: unknown;
      /** Unix timestamp in milliseconds when the LLM call started */
      startTime: number;
      /** Unix timestamp in milliseconds when the LLM call completed */
      endTime: number;
      /** Number of tokens in the input/prompt (if available from LLM provider) */
      inputTokens?: number;
      /** Number of tokens in the output/completion (if available from LLM provider) */
      outputTokens?: number;
      /** Total tokens used (input + output, if available from LLM provider) */
      totalTokens?: number;
      /** Zero-based order of this trace within the result */
      colOrder: number;
    };

    /** Individual test result for a single data point */
    export type Result = {
      /** Unique identifier for this result */
      id: number;
      /** Duration of this specific test case in milliseconds */
      duration: number;
      /** The input data that was passed to the task function */
      input: unknown;
      /** The output produced by the task function */
      output: unknown;
      /** The expected output for comparison (optional) */
      expected?: unknown;
      /** Status of this specific test: "success" or "fail" */
      status: "success" | "fail" | "running";
      /** Zero-based order of this result within the evaluation */
      colOrder: number;
      /** Custom columns rendered for display in the UI (if any) */
      renderedColumns?: unknown;
      /** ISO 8601 timestamp when the result was created */
      createdAt: string;
      /** Average score for this result across all scorers (0-1 scale) */
      averageScore: number;
      /** Scores from all scorer functions applied to this result */
      scores: Score[];
      /** Traces of LLM calls made during this test */
      traces: Trace[];
    };

    /** Evaluation containing multiple test results */
    export type Eval = {
      /** Unique identifier for this evaluation */
      id: number;
      /** The name of the evaluation as defined in the evalite() call */
      name: string;
      /** Absolute path to the .eval.ts file containing this evaluation */
      filepath: string;
      /** Total duration of the evaluation in milliseconds */
      duration: number;
      /** Overall status of the evaluation: "success" means all tests passed, "fail" means at least one failed */
      status: "fail" | "success" | "running";
      /** Optional variant name if using A/B testing or experimentation features */
      variantName?: string;
      /** Optional variant group name for organizing related variants */
      variantGroup?: string;
      /** ISO 8601 timestamp when the evaluation was created */
      createdAt: string;
      /** Average score across all results in this evaluation (0-1 scale) */
      averageScore: number;
      /** Individual test results for each data point in the evaluation */
      results: Result[];
    };

    /**
     * The complete output structure for exporting evaluation results.
     * This format is designed to be a comprehensive snapshot of a test run,
     * suitable for archiving, analysis, or importing into other systems.
     */
    export type Output = {
      /** Metadata about the test run */
      run: Run;
      /** Array of evaluations that were executed in this run */
      evals: Eval[];
    };
  }
}

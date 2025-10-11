import type { Db } from "./db.js";

export declare namespace Evalite {
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
  }

  export interface ResultAfterFilesSaved extends InitialResult {
    /**
     * Technically, input and expected are known at the start
     * of the evaluation. But because they may be files, they
     * need to be saved asynchronously.
     *
     * This is why they are only included in the final result.
     */
    input: unknown;
    expected?: unknown;
  }

  export type ResultStatus = "success" | "fail" | "running";

  export type RenderedColumn = {
    label: string;
    value: unknown;
  };

  export interface Result extends ResultAfterFilesSaved {
    /**
     * Technically, input and expected are known at the start
     * of the evaluation. But because they may be files, they
     * need to be saved asynchronously.
     *
     * This is why they are only included in the final result.
     */
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

  export type TaskMeta = {
    initialResult?: InitialResult;
    resultAfterFilesSaved?: ResultAfterFilesSaved;
    result?: Result;
    duration: number | undefined;
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
      | { input: TInput; expected?: TExpected }[]
      | (() => MaybePromise<{ input: TInput; expected?: TExpected }[]>);
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
      evaluation: Db.Eval & { results: (Db.Result & { scores: Db.Score[] })[] };
      prevEvaluation:
        | (Db.Eval & { results: (Db.Result & { scores: Db.Score[] })[] })
        | undefined;
    };

    export type GetMenuItemsResultEval = {
      filepath: string;
      score: number;
      name: string;
      prevScore: number | undefined;
      evalStatus: Db.EvalStatus;
      variantName: string | undefined;
      variantGroup: string | undefined;
    };

    export type GetMenuItemsResult = {
      evals: GetMenuItemsResultEval[];
      score: number;
      prevScore: number | undefined;
      evalStatus: Db.EvalStatus;
    };

    export type GetResultResult = {
      result: Db.Result & {
        traces: Db.Trace[];
        score: number;
        scores: Db.Score[];
      };
      prevResult:
        | (Db.Result & { score: number; scores: Db.Score[] })
        | undefined;
      evaluation: Db.Eval;
    };
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

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

  export type ResultStatus = "success" | "fail";

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
    status: ResultStatus;
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
    data: () => MaybePromise<{ input: TInput; expected?: TExpected }[]>;
    task: Task<TInput, TOutput, TVariant>;
    scorers: Array<
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
}

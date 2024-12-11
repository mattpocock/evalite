export declare namespace Evalite {
  export type RunType = "full" | "partial";

  export type RunningServerState = {
    type: "running";
    runType: RunType;
    filepaths: string[];
    runId: number | bigint;
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
    input: unknown;
    expected?: unknown;
  }

  export interface Result extends InitialResult {
    output: unknown;
    scores: Score[];
    duration: number;
    traces: Trace[];
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

  export type ScoreInput<TInput, TExpected> = {
    input: TInput;
    output: TExpected;
    expected?: TExpected;
  };

  export type TaskMeta = {
    initialResult?: InitialResult;
    result?: Result;
    duration: number | undefined;
  };

  export type Task<TInput, TExpected> = (
    input: TInput
  ) => MaybePromise<TExpected | AsyncIterable<TExpected>>;

  export type Scorer<TInput, TExpected> = (
    opts: ScoreInput<TInput, TExpected>
  ) => MaybePromise<Score>;

  export type RunnerOpts<TInput, TExpected> = {
    data: () => MaybePromise<{ input: TInput; expected?: TExpected }[]>;
    task: Task<TInput, TExpected>;
    scorers: Scorer<TInput, TExpected>[];
  };

  export interface Trace {
    input: unknown;
    usage?: {
      promptTokens: number;
      completionTokens: number;
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
}

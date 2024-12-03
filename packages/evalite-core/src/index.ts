export * from "./constants.js";

export declare namespace Evalite {
  export type WebsocketEvent =
    | {
        type: "RUN_IN_PROGRESS";
      }
    | {
        type: "RUN_COMPLETE";
      };

  export type MaybePromise<T> = T | Promise<T>;

  export type Result = {
    input: unknown;
    result: unknown;
    expected: unknown | undefined;
    scores: Score[];
    duration: number;
  };

  export interface Runner {
    <TInput, TExpected>(
      testName: string,
      runnerOpts: RunnerOpts<TInput, TExpected>
    ): void;
    only: Runner;
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
  };

  export type ScoreInput<TExpected> = {
    output: TExpected;
    expected?: TExpected;
  };

  export type TaskMeta = {
    results: Result[];
    duration: number | undefined;
    sourceCodeHash: string;
    traces: StoredTrace[];
  };

  export type Scorer<TExpected> = (
    opts: ScoreInput<TExpected>
  ) => MaybePromise<Score>;

  export type RunnerOpts<TInput, TExpected> = {
    data: () => MaybePromise<{ input: TInput; expected?: TExpected }[]>;
    task: (input: TInput) => MaybePromise<TExpected>;
    scorers: Scorer<TExpected>[];
  };

  export interface UserProvidedTrace {
    prompt: TracePrompt[];
    usage:
      | {
          promptTokens: number;
          completionTokens: number;
        }
      | undefined;
    output: string;
    start: number;
    end: number;
  }

  export interface StoredTrace extends UserProvidedTrace {
    duration: number;
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

export * from "./json-db.js";

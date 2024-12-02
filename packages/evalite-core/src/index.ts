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

  export type TaskReport = {
    file: string;
    task: string;
    input: unknown;
    result: unknown;
    scores: Score[];
  };

  export type Score = {
    score: number;
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
  };

  export type Scorer<TExpected> = (
    opts: ScoreInput<TExpected>
  ) => MaybePromise<Score>;

  export type RunnerOpts<
    TInput,
    TExpected,
    TImport extends Record<string, any>,
    TKey extends keyof TImport,
  > = {
    data: () => MaybePromise<{ input: TInput; expected?: TExpected }[]>;
    task: TImport[TKey] extends (input: TInput) => MaybePromise<TExpected>
      ? readonly [Promise<TImport>, TKey]
      : ErrorMessageForRunnerOpts<TInput, TExpected, TImport[TKey]>;
    scorers: Scorer<TExpected>[];
  };

  export type ErrorMessageForRunnerOpts<
    TInput,
    TExpected,
    TFunc extends (input: any) => any,
  > = TFunc extends (input: TInput) => any
    ? "Return type of function does not match expected value of task"
    : TFunc extends (input: any) => PromiseLike<TExpected>
      ? "Input type of task does not match the dataset passed."
      : "The task passed does not match the type definition for a task.";
}

export * from "./json-db.js";

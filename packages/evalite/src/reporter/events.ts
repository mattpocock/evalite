import type { Evalite } from "../types.js";

export type ReporterEvent =
  | {
      type: "RUN_BEGUN";
      filepaths: string[];
      runType: Evalite.RunType;
    }
  | {
      type: "RUN_ENDED";
    }
  | {
      type: "RESULT_SUBMITTED";
      result: Evalite.Result;
    }
  | {
      type: "RESULT_STARTED";
      initialResult: Evalite.InitialResult;
    };

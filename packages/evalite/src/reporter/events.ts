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
      type: "EVAL_SUBMITTED";
      eval: Evalite.Eval;
    }
  | {
      type: "EVAL_STARTED";
      initialEval: Evalite.InitialEvalResult;
    };

/**
 * Annotation events that can be sent from tests to the reporter via test.annotate()
 */
export type EvaliteAnnotation =
  | {
      type: "EVAL_STARTED";
      initialEval: Evalite.InitialEvalResult;
    }
  | {
      type: "EVAL_SUBMITTED";
      eval: Evalite.Eval;
    };

/**
 * Type-safe serialization of annotation events for test.annotate()
 */
export function serializeAnnotation(annotation: EvaliteAnnotation): string {
  return JSON.stringify(annotation);
}

/**
 * Type-safe deserialization of annotation events from test annotations
 * Returns null if the message is not a valid EvaliteAnnotation
 */
export function deserializeAnnotation(
  message: string
): EvaliteAnnotation | null {
  try {
    const data = JSON.parse(message);

    // Validate that it's an evalite annotation
    if (
      typeof data === "object" &&
      data !== null &&
      "type" in data &&
      typeof data.type === "string"
    ) {
      return data as EvaliteAnnotation;
    }

    return null;
  } catch {
    return null;
  }
}

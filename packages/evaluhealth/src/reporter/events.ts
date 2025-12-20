import type { Evaluhealth } from "../types.js";

export type ReporterEvent =
  | {
      type: "RUN_BEGUN";
      filepaths: string[];
      runType: Evaluhealth.RunType;
    }
  | {
      type: "RUN_ENDED";
    }
  | {
      type: "RESULT_SUBMITTED";
      result: Evaluhealth.Result;
    }
  | {
      type: "RESULT_STARTED";
      initialResult: Evaluhealth.InitialResult;
    };

/**
 * Annotation events that can be sent from tests to the reporter via test.annotate()
 */
export type EvaluhealthAnnotation =
  | {
      type: "RESULT_STARTED";
      initialResult: Evaluhealth.InitialResult;
    }
  | {
      type: "RESULT_SUBMITTED";
      result: Evaluhealth.Result;
    };

/**
 * Type-safe serialization of annotation events for test.annotate()
 */
export function serializeAnnotation(annotation: EvaluhealthAnnotation): string {
  return JSON.stringify(annotation);
}

/**
 * Type-safe deserialization of annotation events from test annotations
 * Returns null if the message is not a valid EvaluhealthAnnotation
 */
export function deserializeAnnotation(
  message: string
): EvaluhealthAnnotation | null {
  try {
    const data = JSON.parse(message);

    // Validate that it's an evaluhealth annotation
    if (
      typeof data === "object" &&
      data !== null &&
      "type" in data &&
      typeof data.type === "string"
    ) {
      return data as EvaluhealthAnnotation;
    }

    return null;
  } catch {
    return null;
  }
}

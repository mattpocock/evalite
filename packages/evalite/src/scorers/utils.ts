import type { Evalite } from "../types.js";
import type { ModelMessage, UserModelMessage } from "ai";

export function isSingleTurnSample(
  sample: Evalite.Scorers.EvaluationSample
): sample is Evalite.Scorers.SingleTurnSample {
  if (Array.isArray(sample.userInput)) return false;
  return true;
}

export function isMultiTurnSample(
  sample: Evalite.Scorers.EvaluationSample
): sample is Evalite.Scorers.MultiTurnSample {
  if (Array.isArray(sample.userInput)) return true;
  return false;
}

export function messageContent(message: ModelMessage) {
  let content = "";
  for (const part of message.content) {
    if (typeof part === "string") {
      content += part;
    } else if (part.type === "text") {
      content += part.text;
    }
  }
  return content;
}

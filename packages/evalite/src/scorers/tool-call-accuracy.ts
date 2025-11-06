import type { ToolCallPart, AssistantModelMessage } from "ai";
import type { Evalite } from "../types.js";
import { createSimpleScorer } from "./base.js";
import { isMultiTurnOutput } from "./utils.js";
import { deepEqual, zip } from "../utils.js";

const DEFAULT_WEIGHTS: Evalite.Scorers.ToolCallAccuracyWeights = {
  exact: 1,
  nameOnly: 0.5,
  extraPenalty: 0.25,
  wrongPenalty: 0.25,
};

/**
 * Checks if your AI is calling the right
 * functions with the right parameters.
 *
 * Two modes:
 * - "exact": Calls must happen in exact order
 *   with exact arguments
 * - "flexible": Calls can happen in any order,
 *   only checks correct functions were called
 *
 * Scoring:
 * - Full credit for correct function + correct
 *   arguments
 * - Partial credit for correct function + wrong
 *   arguments
 * - Penalties for wrong/missing calls
 *
 * When to use: For AI agents that need to call
 * external functions/APIs. Verifies tool calling
 * behavior.
 *
 * When NOT to use: For simple text generation
 * tasks without function calling.
 */
export const toolCallAccuracy = createSimpleScorer<
  Evalite.Scorers.ToolCallAccuracyExpected,
  {
    mode?: Evalite.Scorers.ToolCallAccuracyMode;
    weights?: Partial<Evalite.Scorers.ToolCallAccuracyWeights>;
  }
>({
  name: "Tool Call Accuracy",
  description: "Checks if the tool calls are correct",
  scorer: ({ output, expected, mode = "exact", weights = {} }) => {
    if (!isMultiTurnOutput(output)) {
      throw new Error("Not a multi-turn output");
    }

    const outputToolCalls = getToolCalls(output);
    const referenceToolCalls = expected?.referenceToolCalls ?? [];

    const edgeCaseResult = validateToolCallArrays(
      outputToolCalls,
      referenceToolCalls
    );
    if (edgeCaseResult) return edgeCaseResult;

    const mergedWeights = { ...DEFAULT_WEIGHTS, ...weights };

    if (mode === "exact") {
      return scoreExactMode(outputToolCalls, referenceToolCalls, mergedWeights);
    } else if (mode === "flexible") {
      return scoreFlexibleMode(
        outputToolCalls,
        referenceToolCalls,
        mergedWeights
      );
    } else {
      throw new Error(`Invalid mode: ${mode}`);
    }
  },
});

function scoreExactMode(
  outputToolCalls: Evalite.Scorers.ToolCall[],
  referenceToolCalls: Evalite.Scorers.ToolCall[],
  weights: Evalite.Scorers.ToolCallAccuracyWeights
): Evalite.UserProvidedScoreWithMetadata {
  const components = computeExactComponents(
    outputToolCalls,
    referenceToolCalls
  );
  const denom = calculateDenominator(referenceToolCalls.length);
  const score = clamp01(
    (components.exact + weights.nameOnly * components.nameOnly) / denom -
      weights.wrongPenalty * (components.wrong / denom)
  );

  return {
    score,
    metadata: {
      mode: "exact",
      exactMatches: components.exact,
      nameOnlyMatches: components.nameOnly,
      wrongOrMissing: components.wrong,
      totals: {
        reference: referenceToolCalls.length,
        output: outputToolCalls.length,
      },
    },
  };
}

function scoreFlexibleMode(
  outputToolCalls: Evalite.Scorers.ToolCall[],
  referenceToolCalls: Evalite.Scorers.ToolCall[],
  weights: Evalite.Scorers.ToolCallAccuracyWeights
): Evalite.UserProvidedScoreWithMetadata {
  const components = computeFlexibleComponents(
    outputToolCalls,
    referenceToolCalls
  );
  const denom = calculateDenominator(referenceToolCalls.length);
  const score = clamp01(
    (components.exact + weights.nameOnly * components.nameOnly) / denom -
      weights.extraPenalty * (components.extras / denom)
  );

  return {
    score,
    metadata: {
      mode: "flexible",
      exactMatches: components.exact,
      nameOnlyMatches: components.nameOnly,
      extras: components.extras,
      missing: components.missing,
      totals: {
        reference: referenceToolCalls.length,
        output: outputToolCalls.length,
      },
      details: {
        matches: components.matches,
        nameOnlyMatches: components.nameOnlyMatches,
        extras: components.extrasList,
        missingToolCalls: components.missingToolCalls,
      },
    },
  };
}

function computeExactComponents(
  outputToolCalls: Evalite.Scorers.ToolCall[],
  referenceToolCalls: Evalite.Scorers.ToolCall[]
): ExactModeComponents {
  const pairs = zip(outputToolCalls, referenceToolCalls);
  let exact = 0;
  let nameOnly = 0;
  let wrong = 0;

  for (const [out, ref] of pairs) {
    const category = categorizePair(out, ref);
    if (category === "exact") exact++;
    else if (category === "nameOnly") nameOnly++;
    else wrong++;
  }

  const extras = Math.max(
    0,
    outputToolCalls.length - referenceToolCalls.length
  );
  wrong += extras;

  return { exact, nameOnly, wrong };
}

function computeFlexibleComponents(
  outputToolCalls: Evalite.Scorers.ToolCall[],
  referenceToolCalls: Evalite.Scorers.ToolCall[]
): FlexibleModeComponents {
  const refMap = buildReferenceMap(referenceToolCalls);
  const { matches, leftovers } = findExactMatches(outputToolCalls, refMap);
  const missingToolCalls = collectMissingFromMap(refMap);
  const missingByName = buildMissingByNameMap(missingToolCalls);
  const { nameOnlyMatches, extrasList } = categorizeLeftovers(
    leftovers,
    missingByName
  );
  const missing = computeTotalMissing(missingByName);

  return {
    exact: matches.length,
    nameOnly: nameOnlyMatches.length,
    extras: extrasList.length,
    missing,
    matches,
    nameOnlyMatches,
    extrasList,
    missingToolCalls,
  };
}

function validateToolCallArrays(
  outputToolCalls: Evalite.Scorers.ToolCall[],
  referenceToolCalls: Evalite.Scorers.ToolCall[]
): Evalite.UserProvidedScoreWithMetadata | null {
  if (referenceToolCalls.length === 0 && outputToolCalls.length === 0) {
    return { score: 1, metadata: { note: "Both empty - perfect match" } };
  }
  if (referenceToolCalls.length === 0) {
    return {
      score: 0,
      metadata: {
        warning: "Reference tool calls are empty but predictions exist",
        outputCount: outputToolCalls.length,
      },
    };
  }
  if (outputToolCalls.length === 0) {
    return {
      score: 0,
      metadata: {
        warning: "No tool calls found in output",
        referenceCount: referenceToolCalls.length,
      },
    };
  }
  return null;
}

function categorizePair(
  out: Evalite.Scorers.ToolCall | undefined,
  ref: Evalite.Scorers.ToolCall | undefined
): PairCategory {
  if (!ref || !out) return "wrong";

  const nameMatches = out.toolName === ref.toolName;
  if (!nameMatches) return "wrong";

  const argScore = getArgumentScore(out, ref);
  return argScore >= 1.0 ? "exact" : "nameOnly";
}

function buildReferenceMap(
  referenceToolCalls: Evalite.Scorers.ToolCall[]
): Map<string, Evalite.Scorers.ToolCall[]> {
  const refMap = new Map<string, Evalite.Scorers.ToolCall[]>();
  for (const call of referenceToolCalls) {
    const key = stringifyToolCall(call);
    if (!refMap.has(key)) refMap.set(key, []);
    refMap.get(key)!.push(call);
  }
  return refMap;
}

function findExactMatches(
  outputToolCalls: Evalite.Scorers.ToolCall[],
  refMap: Map<string, Evalite.Scorers.ToolCall[]>
): {
  matches: Evalite.Scorers.ToolCall[];
  leftovers: Evalite.Scorers.ToolCall[];
} {
  const matches: Evalite.Scorers.ToolCall[] = [];
  const leftovers: Evalite.Scorers.ToolCall[] = [];

  for (const out of outputToolCalls) {
    const key = stringifyToolCall(out);
    const refList = refMap.get(key);
    if (refList && refList.length > 0) {
      refList.pop();
      matches.push(out);
    } else {
      leftovers.push(out);
    }
  }

  return { matches, leftovers };
}

function collectMissingFromMap(
  refMap: Map<string, Evalite.Scorers.ToolCall[]>
): Evalite.Scorers.ToolCall[] {
  const missingToolCalls: Evalite.Scorers.ToolCall[] = [];
  for (const refList of refMap.values()) {
    missingToolCalls.push(...refList);
  }
  return missingToolCalls;
}

function buildMissingByNameMap(
  missingToolCalls: Evalite.Scorers.ToolCall[]
): Map<string, number> {
  const missingByName = new Map<string, number>();
  for (const call of missingToolCalls) {
    missingByName.set(
      call.toolName,
      (missingByName.get(call.toolName) || 0) + 1
    );
  }
  return missingByName;
}

function categorizeLeftovers(
  leftovers: Evalite.Scorers.ToolCall[],
  missingByName: Map<string, number>
): {
  nameOnlyMatches: Evalite.Scorers.ToolCall[];
  extrasList: Evalite.Scorers.ToolCall[];
} {
  const nameOnlyMatches: Evalite.Scorers.ToolCall[] = [];
  const extrasList: Evalite.Scorers.ToolCall[] = [];

  for (const out of leftovers) {
    const remaining = missingByName.get(out.toolName) || 0;
    if (remaining > 0) {
      nameOnlyMatches.push(out);
      missingByName.set(out.toolName, remaining - 1);
    } else {
      extrasList.push(out);
    }
  }

  return { nameOnlyMatches, extrasList };
}

function computeTotalMissing(missingByName: Map<string, number>): number {
  let missing = 0;
  for (const count of missingByName.values()) {
    missing += count;
  }
  return missing;
}

function getToolCalls(
  output: Evalite.Scorers.MultiTurnOutput
): Evalite.Scorers.ToolCall[] {
  const toolCalls: Evalite.Scorers.ToolCall[] = [];
  for (const message of output) {
    if (message.role === "assistant") {
      for (const part of message.content) {
        if (isToolCall(part)) {
          toolCalls.push({
            toolName: part.toolName,
            input: part.input as Record<string, unknown>,
          });
        }
      }
    }
  }
  return toolCalls;
}

function getArgumentScore(
  outputCall: Evalite.Scorers.ToolCall,
  refCall: Evalite.Scorers.ToolCall
): number {
  if (refCall.input === undefined) return 1.0;
  if (outputCall.input === undefined) return 0.0;
  return deepEqual(outputCall.input, refCall.input) ? 1.0 : 0.0;
}

function stringifyToolCall(toolCall: Evalite.Scorers.ToolCall): string {
  return JSON.stringify({
    toolName: toolCall.toolName,
    input: stableSerialize(toolCall.input),
  });
}

function isToolCall(
  part: AssistantModelMessage["content"][number]
): part is ToolCallPart {
  return (
    typeof part === "object" && "type" in part && part.type === "tool-call"
  );
}

function calculateDenominator(referenceLength: number): number {
  return Math.max(referenceLength, 1);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function stableSerialize(value: unknown): unknown {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  const valueType = typeof value;
  if (valueType !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item) => stableSerialize(item));
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    result[key] = stableSerialize(obj[key]);
  }
  return result;
}

type PairCategory = "exact" | "nameOnly" | "wrong";

type ExactModeComponents = {
  exact: number;
  nameOnly: number;
  wrong: number;
};

type FlexibleModeComponents = {
  exact: number;
  nameOnly: number;
  extras: number;
  missing: number;
  matches: Evalite.Scorers.ToolCall[];
  nameOnlyMatches: Evalite.Scorers.ToolCall[];
  extrasList: Evalite.Scorers.ToolCall[];
  missingToolCalls: Evalite.Scorers.ToolCall[];
};

import { createLLMScorer } from "./base.js";
import type { Evalite } from "../types.js";
import { isMultiTurnOutput } from "./utils.js";
import {
  decomposeIntoStatements,
  evaluateStatementsSimple,
} from "./utils/statement-evaluation.js";

export const noiseSensitivity = createLLMScorer<
  Evalite.Scorers.NoiseSensitivityExpected,
  {
    mode?: "relevant" | "irrelevant";
  }
>({
  name: "Noise Sensitivity",
  description:
    "Evaluates whether incorrect answers are influenced by relevant or irrelevant retrieved contexts",

  scorer: async ({ input, output, expected, model, mode = "relevant" }) => {
    if (mode !== "relevant" && mode !== "irrelevant") {
      throw new Error(
        `Invalid mode: ${mode}. Must be 'relevant' or 'irrelevant'.`
      );
    }

    if (!expected?.referenceAnswer) {
      throw new Error(
        "referenceAnswer is required in the expected data for noise sensitivity scorer"
      );
    }

    if (!expected?.groundTruth || expected.groundTruth.length === 0) {
      throw new Error(
        "groundTruth (retrieved contexts) is required and must not be empty for noise sensitivity scorer"
      );
    }

    if (isMultiTurnOutput(output)) {
      throw new Error(
        "Noise Sensitivity scorer does not support multi-turn output"
      );
    }

    const referenceStatements = await decomposeIntoStatements(
      input,
      expected.referenceAnswer,
      model
    );

    const answerStatements = await decomposeIntoStatements(
      input,
      output,
      model
    );

    if (referenceStatements.length === 0) {
      throw new Error("No statements were generated from the reference answer");
    }

    if (answerStatements.length === 0) {
      throw new Error("No statements were generated from the model output");
    }

    const retrievedToGroundTruth: boolean[][] = [];
    const retrievedToAnswer: boolean[][] = [];

    for (const context of expected.groundTruth) {
      const groundTruthVerdicts = await evaluateStatementsSimple(
        context,
        referenceStatements,
        model
      );
      retrievedToGroundTruth.push(groundTruthVerdicts.map((v) => v === 1));

      const answerVerdicts = await evaluateStatementsSimple(
        context,
        answerStatements,
        model
      );
      retrievedToAnswer.push(answerVerdicts.map((v) => v === 1));
    }

    const groundTruthToAnswerVerdicts = await evaluateStatementsSimple(
      expected.referenceAnswer,
      answerStatements,
      model
    );
    const groundTruthToAnswer = groundTruthToAnswerVerdicts.map((v) => v === 1);

    const result = computeScore({
      retrievedToGroundTruth,
      retrievedToAnswer,
      groundTruthToAnswer,
      mode,
    });

    return {
      score: result.score,
      metadata: {
        referenceStatements,
        answerStatements,
        incorrectStatements: answerStatements.filter(
          (_, i) => !groundTruthToAnswer[i]
        ),
        relevantContextIndices: result.relevantContextIndices,
        irrelevantContextIndices: result.irrelevantContextIndices,
        mode,
        retrievedToGroundTruth: retrievedToGroundTruth,
        retrievedToAnswer: retrievedToAnswer,
        groundTruthToAnswer: groundTruthToAnswer,
      },
    };
  },
});

function computeScore(params: {
  retrievedToGroundTruth: boolean[][];
  retrievedToAnswer: boolean[][];
  groundTruthToAnswer: boolean[];
  mode: "relevant" | "irrelevant";
}): {
  score: number;
  relevantContextIndices: number[];
  irrelevantContextIndices: number[];
} {
  const {
    retrievedToGroundTruth,
    retrievedToAnswer,
    groundTruthToAnswer,
    mode,
  } = params;

  const numContexts = retrievedToGroundTruth.length;
  const numAnswerStatements = groundTruthToAnswer.length;

  const retrievedToGroundTruthTransposed = transpose(retrievedToGroundTruth);
  const retrievedToAnswerTransposed = transpose(retrievedToAnswer);

  const relevantContexts: boolean[] = [];
  for (let contextIndex = 0; contextIndex < numContexts; contextIndex++) {
    let isRelevant = false;
    for (const groundTruthStatementRow of retrievedToGroundTruthTransposed) {
      if (groundTruthStatementRow[contextIndex]) {
        isRelevant = true;
        break;
      }
    }
    relevantContexts.push(isRelevant);
  }

  const relevantFaithful: boolean[] = [];
  for (let answerIndex = 0; answerIndex < numAnswerStatements; answerIndex++) {
    let isFaithfulToRelevant = false;
    for (let contextIndex = 0; contextIndex < numContexts; contextIndex++) {
      const answerRow = retrievedToAnswerTransposed[answerIndex];
      if (
        answerRow &&
        relevantContexts[contextIndex] &&
        answerRow[contextIndex]
      ) {
        isFaithfulToRelevant = true;
        break;
      }
    }
    relevantFaithful.push(isFaithfulToRelevant);
  }

  const relevantContextIndices = relevantContexts
    .map((relevant, index) => (relevant ? index : -1))
    .filter((index) => index !== -1);

  const irrelevantContextIndices = relevantContexts
    .map((relevant, index) => (!relevant ? index : -1))
    .filter((index) => index !== -1);

  if (mode === "irrelevant") {
    const irrelevantFaithful: boolean[] = [];
    for (
      let answerIndex = 0;
      answerIndex < numAnswerStatements;
      answerIndex++
    ) {
      let isFaithfulToIrrelevant = false;
      for (let contextIndex = 0; contextIndex < numContexts; contextIndex++) {
        const answerRow = retrievedToAnswerTransposed[answerIndex];
        if (
          answerRow &&
          !relevantContexts[contextIndex] &&
          answerRow[contextIndex]
        ) {
          isFaithfulToIrrelevant = true;
          break;
        }
      }
      if (isFaithfulToIrrelevant && !relevantFaithful[answerIndex]) {
        irrelevantFaithful.push(true);
      } else {
        irrelevantFaithful.push(false);
      }
    }

    let count = 0;
    for (let i = 0; i < numAnswerStatements; i++) {
      if (irrelevantFaithful[i] && !groundTruthToAnswer[i]) {
        count++;
      }
    }

    return {
      score: numAnswerStatements > 0 ? count / numAnswerStatements : 0,
      relevantContextIndices,
      irrelevantContextIndices,
    };
  } else {
    let count = 0;
    for (let i = 0; i < numAnswerStatements; i++) {
      if (relevantFaithful[i] && !groundTruthToAnswer[i]) {
        count++;
      }
    }

    return {
      score: numAnswerStatements > 0 ? count / numAnswerStatements : 0,
      relevantContextIndices,
      irrelevantContextIndices,
    };
  }
}

function transpose(matrix: boolean[][]): boolean[][] {
  if (matrix.length === 0) return [];

  const firstRow = matrix[0];
  if (!firstRow) return [];

  const numRows = matrix.length;
  const numCols = firstRow.length;
  const result: boolean[][] = [];

  for (let colIndex = 0; colIndex < numCols; colIndex++) {
    result[colIndex] = [];
    for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
      const row = matrix[rowIndex];
      if (row) {
        result[colIndex]![rowIndex] = row[colIndex]!;
      }
    }
  }

  return result;
}

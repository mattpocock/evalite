import type { Evalite } from "../../types.js";

/**
 * Computes F-beta score from TP/FP/FN classification.
 *
 * @param classification - Object containing arrays of True Positives, False Positives, and False Negatives
 * @param beta - Beta parameter for F-beta score. Beta > 1 favors recall, beta < 1 favors precision
 * @returns F-beta score between 0.0 and 1.0
 */
export function computeFBetaScore(
  classification: Evalite.Scorers.AnswerCorrectnessClassification,
  beta: number
): number {
  const tp = classification.TP.length;
  const fp = classification.FP.length;
  const fn = classification.FN.length;

  // Calculate precision
  let precision: number;
  if (tp + fp === 0) {
    precision = fn === 0 ? 1.0 : 0.0;
  } else {
    precision = tp / (tp + fp);
  }

  // Calculate recall
  let recall: number;
  if (tp + fn === 0) {
    recall = fp === 0 ? 1.0 : 0.0;
  } else {
    recall = tp / (tp + fn);
  }

  // Calculate F-beta score
  if (precision + recall === 0) {
    return 0.0;
  }

  const betaSquared = beta * beta;
  const fScore =
    ((1 + betaSquared) * (precision * recall)) /
    (betaSquared * precision + recall);

  return fScore;
}

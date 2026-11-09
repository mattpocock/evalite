import type { Evalite } from "../types.js";

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type JsonParseFields<T extends object, K extends keyof T> = Prettify<
  Omit<T, K> & Record<K, unknown>
>;

export const jsonParseFields = <T extends object, K extends keyof T>(
  obj: T,
  fields: K[]
): JsonParseFields<T, K> => {
  const objToReturn: any = {};

  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key];
    if ((fields as any).includes(key)) {
      objToReturn[key] = JSON.parse(value);
    } else {
      objToReturn[key] = value;
    }
  }

  return objToReturn;
};

export const jsonParseFieldsArray = <T extends object, K extends keyof T>(
  obj: T[],
  fields: K[]
): JsonParseFields<T, K>[] => {
  return obj.map((o) => jsonParseFields(o, fields));
};

export const computeAverageScores = (
  scores: Evalite.Storage.Entities.Score[]
): Array<{ eval_id: number; average: number }> => {
  const grouped = new Map<number, number[]>();
  for (const score of scores) {
    if (!grouped.has(score.eval_id)) {
      grouped.set(score.eval_id, []);
    }
    grouped.get(score.eval_id)!.push(score.score);
  }
  return Array.from(grouped.entries()).map(([eval_id, scoreVals]) => ({
    eval_id,
    average: scoreVals.reduce((sum, val) => sum + val, 0) / scoreVals.length,
  }));
};

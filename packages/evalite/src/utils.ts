export const sum = <T>(arr: T[], fn: (item: T) => number | undefined) => {
  return arr.reduce((a, b) => a + (fn(b) || 0), 0);
};

export const average = <T>(arr: T[], fn: (item: T) => number | undefined) => {
  return sum(arr, fn) / arr.length;
};

export const max = <T>(arr: T[], fn: (item: T) => number | undefined) => {
  return arr.reduce((a, b) => Math.max(a, fn(b) || 0), 0);
};

import type { Evalite } from "./types.js";

const isEvaliteFile = (file: unknown): file is Evalite.File => {
  return (
    typeof file === "object" &&
    file !== null &&
    "__EvaliteFile" in file &&
    file.__EvaliteFile === true
  );
};

export const EvaliteFile = {
  fromPath: (path: string): Evalite.File => {
    return {
      __EvaliteFile: true,
      path,
    };
  },
  isEvaliteFile: isEvaliteFile,
};

export function zip<T, U>(a: T[], b: U[]): [T, U | undefined][] {
  return a.map((item, index) => [item, b[index]]);
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (Number.isNaN(a as number) && Number.isNaN(b as number)) {
    return true;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (
        !deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key]
        )
      )
        return false;
    }
    return true;
  }

  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

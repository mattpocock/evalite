import type { Evalite } from "evalite/types";

export const scoreToPercent = (score: number) => {
  return `${Math.round(score * 1000) / 10}%`;
};

export const formatTime = (time: number) => {
  if (time < 1000) {
    return `${time.toFixed(0)}ms`;
  }
  return `${(time / 1000).toFixed(2)}s`;
};

export const isArrayOfRenderedColumns = (
  value: unknown
): value is Evalite.RenderedColumn[] => {
  if (!Array.isArray(value)) {
    return false;
  }

  if (value.length === 0) {
    return false;
  }
  return value.every((item) => {
    return (
      typeof item === "object" &&
      item !== null &&
      typeof item.label === "string" &&
      item.value !== undefined
    );
  });
};

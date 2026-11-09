import { describe, it, expect } from "vitest";
import { scoreToPercent, formatTime } from "./utils";

describe("scoreToPercent", () => {
  it("should convert score to percent", () => {
    expect(scoreToPercent(0.123)).toBe("12.3%");
    expect(scoreToPercent(0.456)).toBe("45.6%");
    expect(scoreToPercent(1)).toBe("100%");
  });
});

describe("formatTime", () => {
  it("should format time correctly", () => {
    expect(formatTime(200)).toBe("200ms");
    expect(formatTime(1243)).toBe("1.2s");
    expect(formatTime(4302)).toBe("4.3s");
  });

  it("should round milliseconds to avoid floating point precision issues", () => {
    expect(formatTime(3.090249999999997)).toBe("3ms");
    expect(formatTime(123.456789)).toBe("123ms");
    expect(formatTime(999.9999)).toBe("1000ms");
  });
});

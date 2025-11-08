import { describe, it, expect } from "vitest";
import {
  analyzeForTableRendering,
  analyzeForSingleRowTable,
  tableDataToMarkdown,
  singleRowTableToMarkdown,
} from "./render-detection";

describe("analyzeForTableRendering", () => {
  describe("should return table data", () => {
    it("for simple array of objects with same keys", () => {
      const input = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ];

      const result = analyzeForTableRendering(input);

      expect(result).toEqual({
        headers: ["name", "age"],
        rows: [
          ["Alice", 30],
          ["Bob", 25],
        ],
      });
    });

    it("for array with string, number, boolean, and null values", () => {
      const input = [
        { name: "Alice", active: true, score: 100, note: null },
        { name: "Bob", active: false, score: 95, note: null },
      ];

      const result = analyzeForTableRendering(input);

      expect(result).toEqual({
        headers: ["name", "active", "score", "note"],
        rows: [
          ["Alice", true, 100, null],
          ["Bob", false, 95, null],
        ],
      });
    });

    it("for single-item array", () => {
      const input = [{ name: "Alice", age: 30 }];

      const result = analyzeForTableRendering(input);

      expect(result).toEqual({
        headers: ["name", "age"],
        rows: [["Alice", 30]],
      });
    });

    it("for array at max row limit (10 items)", () => {
      const input = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
      }));

      const result = analyzeForTableRendering(input);

      expect(result).not.toBeNull();
      expect(result?.rows).toHaveLength(10);
    });

    it("for array at max column limit (8 columns)", () => {
      const input = [
        {
          col1: "a",
          col2: "b",
          col3: "c",
          col4: "d",
          col5: "e",
          col6: "f",
          col7: "g",
          col8: "h",
        },
      ];

      const result = analyzeForTableRendering(input);

      expect(result).not.toBeNull();
      expect(result?.headers).toHaveLength(8);
    });
  });

  describe("should return null", () => {
    it("for non-array input", () => {
      expect(analyzeForTableRendering({ name: "Alice" })).toBeNull();
      expect(analyzeForTableRendering("string")).toBeNull();
      expect(analyzeForTableRendering(123)).toBeNull();
      expect(analyzeForTableRendering(null)).toBeNull();
    });

    it("for empty array", () => {
      expect(analyzeForTableRendering([])).toBeNull();
    });

    it("for array exceeding row limit (>10 items)", () => {
      const input = Array.from({ length: 11 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
      }));

      expect(analyzeForTableRendering(input)).toBeNull();
    });

    it("for array exceeding column limit (>8 columns)", () => {
      const input = [
        {
          col1: "a",
          col2: "b",
          col3: "c",
          col4: "d",
          col5: "e",
          col6: "f",
          col7: "g",
          col8: "h",
          col9: "i", // 9th column
        },
      ];

      expect(analyzeForTableRendering(input)).toBeNull();
    });

    it("for array of primitives", () => {
      expect(analyzeForTableRendering([1, 2, 3])).toBeNull();
      expect(analyzeForTableRendering(["a", "b", "c"])).toBeNull();
    });

    it("for array of arrays", () => {
      expect(
        analyzeForTableRendering([
          [1, 2],
          [3, 4],
        ])
      ).toBeNull();
    });

    it("for array with mixed types", () => {
      expect(
        analyzeForTableRendering([{ name: "Alice" }, "Bob", 123])
      ).toBeNull();
    });

    it("for array with objects having different keys", () => {
      const input = [
        { name: "Alice", age: 30 },
        { name: "Bob", city: "NYC" }, // Different keys
      ];

      expect(analyzeForTableRendering(input)).toBeNull();
    });

    it("for array with objects having different number of keys", () => {
      const input = [
        { name: "Alice", age: 30 },
        { name: "Bob" }, // Missing 'age'
      ];

      expect(analyzeForTableRendering(input)).toBeNull();
    });

    it("for array with nested objects", () => {
      const input = [
        { name: "Alice", address: { city: "NYC" } },
        { name: "Bob", address: { city: "LA" } },
      ];

      expect(analyzeForTableRendering(input)).toBeNull();
    });

    it("for array with nested arrays", () => {
      const input = [
        { name: "Alice", scores: [1, 2, 3] },
        { name: "Bob", scores: [4, 5, 6] },
      ];

      expect(analyzeForTableRendering(input)).toBeNull();
    });

    it("for array exceeding depth limit", () => {
      const input = [{ name: "Alice", data: { nested: { deep: "value" } } }];

      expect(analyzeForTableRendering(input)).toBeNull();
    });

    it("for array with null elements", () => {
      expect(analyzeForTableRendering([{ name: "Alice" }, null])).toBeNull();
    });
  });
});

describe("analyzeForSingleRowTable", () => {
  describe("should return table data", () => {
    it("for simple flat object", () => {
      const input = { name: "Alice", age: 30 };

      const result = analyzeForSingleRowTable(input);

      expect(result).toEqual({
        headers: ["name", "age"],
        values: ["Alice", 30],
      });
    });

    it("for object with string, number, boolean, and null values", () => {
      const input = {
        name: "Alice",
        active: true,
        score: 100,
        note: null,
      };

      const result = analyzeForSingleRowTable(input);

      expect(result).toEqual({
        headers: ["name", "active", "score", "note"],
        values: ["Alice", true, 100, null],
      });
    });

    it("for object with single key", () => {
      const input = { name: "Alice" };

      const result = analyzeForSingleRowTable(input);

      expect(result).toEqual({
        headers: ["name"],
        values: ["Alice"],
      });
    });

    it("for object at max column limit (8 keys)", () => {
      const input = {
        col1: "a",
        col2: "b",
        col3: "c",
        col4: "d",
        col5: "e",
        col6: "f",
        col7: "g",
        col8: "h",
      };

      const result = analyzeForSingleRowTable(input);

      expect(result).not.toBeNull();
      expect(result?.headers).toHaveLength(8);
    });
  });

  describe("should return null", () => {
    it("for non-object input", () => {
      expect(analyzeForSingleRowTable("string")).toBeNull();
      expect(analyzeForSingleRowTable(123)).toBeNull();
      expect(analyzeForSingleRowTable(true)).toBeNull();
      expect(analyzeForSingleRowTable(null)).toBeNull();
    });

    it("for array input", () => {
      expect(analyzeForSingleRowTable([1, 2, 3])).toBeNull();
      expect(analyzeForSingleRowTable([{ name: "Alice" }])).toBeNull();
    });

    it("for empty object", () => {
      expect(analyzeForSingleRowTable({})).toBeNull();
    });

    it("for object exceeding column limit (>8 keys)", () => {
      const input = {
        col1: "a",
        col2: "b",
        col3: "c",
        col4: "d",
        col5: "e",
        col6: "f",
        col7: "g",
        col8: "h",
        col9: "i", // 9th key
      };

      expect(analyzeForSingleRowTable(input)).toBeNull();
    });

    it("for object with nested object values", () => {
      const input = {
        name: "Alice",
        address: { city: "NYC" },
      };

      expect(analyzeForSingleRowTable(input)).toBeNull();
    });

    it("for object with array values", () => {
      const input = {
        name: "Alice",
        scores: [1, 2, 3],
      };

      expect(analyzeForSingleRowTable(input)).toBeNull();
    });

    it("for object with function values", () => {
      const input = {
        name: "Alice",
        fn: () => {},
      };

      expect(analyzeForSingleRowTable(input)).toBeNull();
    });
  });
});

describe("tableDataToMarkdown", () => {
  it("should convert simple table data to markdown", () => {
    const data = {
      headers: ["name", "age"],
      rows: [
        ["Alice", 30],
        ["Bob", 25],
      ],
    };

    const result = tableDataToMarkdown(data);

    expect(result).toBe(
      "| name | age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |"
    );
  });

  it("should handle null values as empty cells", () => {
    const data = {
      headers: ["name", "note"],
      rows: [
        ["Alice", null],
        ["Bob", "Has note"],
      ],
    };

    const result = tableDataToMarkdown(data);

    expect(result).toBe(
      "| name | note |\n| --- | --- |\n| Alice |  |\n| Bob | Has note |"
    );
  });

  it("should handle boolean values", () => {
    const data = {
      headers: ["name", "active"],
      rows: [
        ["Alice", true],
        ["Bob", false],
      ],
    };

    const result = tableDataToMarkdown(data);

    expect(result).toBe(
      "| name | active |\n| --- | --- |\n| Alice | true |\n| Bob | false |"
    );
  });

  it("should escape pipe characters in cell content", () => {
    const data = {
      headers: ["name", "description"],
      rows: [["Alice", "Uses | pipes"]],
    };

    const result = tableDataToMarkdown(data);

    expect(result).toContain("Uses \\| pipes");
  });

  it("should replace newlines with spaces in cell content", () => {
    const data = {
      headers: ["name", "bio"],
      rows: [["Alice", "Line 1\nLine 2"]],
    };

    const result = tableDataToMarkdown(data);

    expect(result).toContain("Line 1 Line 2");
  });

  it("should handle single row", () => {
    const data = {
      headers: ["name", "age"],
      rows: [["Alice", 30]],
    };

    const result = tableDataToMarkdown(data);

    expect(result).toBe("| name | age |\n| --- | --- |\n| Alice | 30 |");
  });

  it("should handle many columns", () => {
    const data = {
      headers: ["a", "b", "c", "d"],
      rows: [[1, 2, 3, 4]],
    };

    const result = tableDataToMarkdown(data);

    expect(result).toBe(
      "| a | b | c | d |\n| --- | --- | --- | --- |\n| 1 | 2 | 3 | 4 |"
    );
  });
});

describe("singleRowTableToMarkdown", () => {
  it("should convert simple single-row table to markdown", () => {
    const data = {
      headers: ["name", "age"],
      values: ["Alice", 30],
    };

    const result = singleRowTableToMarkdown(data);

    expect(result).toBe("| name | age |\n| --- | --- |\n| Alice | 30 |");
  });

  it("should handle null values as empty cells", () => {
    const data = {
      headers: ["name", "note"],
      values: ["Alice", null],
    };

    const result = singleRowTableToMarkdown(data);

    expect(result).toBe("| name | note |\n| --- | --- |\n| Alice |  |");
  });

  it("should handle boolean values", () => {
    const data = {
      headers: ["name", "active"],
      values: ["Alice", true],
    };

    const result = singleRowTableToMarkdown(data);

    expect(result).toBe("| name | active |\n| --- | --- |\n| Alice | true |");
  });

  it("should escape pipe characters in cell content", () => {
    const data = {
      headers: ["name", "description"],
      values: ["Alice", "Uses | pipes"],
    };

    const result = singleRowTableToMarkdown(data);

    expect(result).toContain("Uses \\| pipes");
  });

  it("should replace newlines with spaces in cell content", () => {
    const data = {
      headers: ["name", "bio"],
      values: ["Alice", "Line 1\nLine 2"],
    };

    const result = singleRowTableToMarkdown(data);

    expect(result).toContain("Line 1 Line 2");
  });

  it("should handle single column", () => {
    const data = {
      headers: ["name"],
      values: ["Alice"],
    };

    const result = singleRowTableToMarkdown(data);

    expect(result).toBe("| name |\n| --- |\n| Alice |");
  });

  it("should handle many columns", () => {
    const data = {
      headers: ["a", "b", "c", "d"],
      values: [1, 2, 3, 4],
    };

    const result = singleRowTableToMarkdown(data);

    expect(result).toBe(
      "| a | b | c | d |\n| --- | --- | --- | --- |\n| 1 | 2 | 3 | 4 |"
    );
  });
});

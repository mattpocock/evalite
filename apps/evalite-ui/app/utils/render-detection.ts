/**
 * Utilities for detecting when objects/arrays can be rendered as markdown tables
 * instead of JSON trees for better readability.
 */

export interface TableData {
  headers: string[];
  rows: Array<Array<string | number | boolean | null>>;
}

export interface SingleRowTableData {
  headers: string[];
  values: Array<string | number | boolean | null>;
}

// Thresholds for intelligent detection
const MAX_TABLE_ROWS = 10;
const MAX_TABLE_COLUMNS = 8;
const MAX_OBJECT_DEPTH = 2;

/**
 * Check if a value is a primitive that can be rendered in a table cell
 */
const isPrimitiveValue = (value: unknown): boolean => {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
};

/**
 * Calculate the depth of nested objects/arrays
 */
const getObjectDepth = (obj: unknown, currentDepth = 1): number => {
  if (!obj || typeof obj !== "object") {
    return currentDepth;
  }

  const values = Array.isArray(obj) ? obj : Object.values(obj);
  if (values.length === 0) {
    return currentDepth;
  }

  const depths = values.map((value) => {
    if (value && typeof value === "object") {
      return getObjectDepth(value, currentDepth + 1);
    }
    return currentDepth;
  });

  return Math.max(...depths);
};

/**
 * Check if all objects in an array have the same keys
 */
const haveSameKeys = (objects: object[]): boolean => {
  if (objects.length === 0) return false;

  const firstKeys = Object.keys(objects[0]!).sort();
  return objects.every((obj) => {
    const keys = Object.keys(obj).sort();
    return (
      keys.length === firstKeys.length &&
      keys.every((key, i) => key === firstKeys[i])
    );
  });
};

/**
 * Check if all values in an object are primitives (for single-row table)
 */
const hasOnlyPrimitiveValues = (obj: object): boolean => {
  return Object.values(obj).every(isPrimitiveValue);
};

/**
 * Analyze an array to see if it should be rendered as a multi-row table
 */
export const analyzeForTableRendering = (input: unknown): TableData | null => {
  // Must be an array
  if (!Array.isArray(input)) {
    return null;
  }

  // Must not be empty
  if (input.length === 0) {
    return null;
  }

  // Must not exceed row limit
  if (input.length > MAX_TABLE_ROWS) {
    return null;
  }

  // All elements must be objects (not arrays or primitives)
  const allObjects = input.every(
    (item) => item !== null && typeof item === "object" && !Array.isArray(item)
  );
  if (!allObjects) {
    return null;
  }

  const objects = input as object[];

  // All objects must have the same keys
  if (!haveSameKeys(objects)) {
    return null;
  }

  const headers = Object.keys(objects[0]!);

  // Must not exceed column limit
  if (headers.length > MAX_TABLE_COLUMNS) {
    return null;
  }

  // All values must be primitives
  const allPrimitives = objects.every((obj) =>
    Object.values(obj).every(isPrimitiveValue)
  );
  if (!allPrimitives) {
    return null;
  }

  // Check depth (should be shallow)
  if (getObjectDepth(input) > MAX_OBJECT_DEPTH) {
    return null;
  }

  // Extract rows
  const rows = objects.map((obj) =>
    headers.map((header) => (obj as any)[header])
  );

  return { headers, rows };
};

/**
 * Analyze an object to see if it should be rendered as a single-row table
 */
export const analyzeForSingleRowTable = (
  input: unknown
): SingleRowTableData | null => {
  // Must be an object (not array, not null)
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const obj = input as object;
  const keys = Object.keys(obj);

  // Must have at least one key
  if (keys.length === 0) {
    return null;
  }

  // Must not exceed column limit
  if (keys.length > MAX_TABLE_COLUMNS) {
    return null;
  }

  // All values must be primitives
  if (!hasOnlyPrimitiveValues(obj)) {
    return null;
  }

  // Check depth
  if (getObjectDepth(input) > 1) {
    return null;
  }

  const values = keys.map((key) => (obj as any)[key]);

  return { headers: keys, values };
};

/**
 * Convert table data to markdown table syntax
 */
export const tableDataToMarkdown = (data: TableData): string => {
  const { headers, rows } = data;

  // Header row
  const headerRow = `| ${headers.join(" | ")} |`;

  // Separator row
  const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;

  // Data rows
  const dataRows = rows.map((row) => {
    const cells = row.map((cell) => {
      if (cell === null) return "";
      if (typeof cell === "string") {
        // Escape pipes and newlines in cell content
        return cell.replace(/\|/g, "\\|").replace(/\n/g, " ");
      }
      return String(cell);
    });
    return `| ${cells.join(" | ")} |`;
  });

  return [headerRow, separatorRow, ...dataRows].join("\n");
};

/**
 * Convert single-row table data to markdown table syntax
 */
export const singleRowTableToMarkdown = (data: SingleRowTableData): string => {
  const { headers, values } = data;

  // Header row
  const headerRow = `| ${headers.join(" | ")} |`;

  // Separator row
  const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;

  // Data row
  const cells = values.map((cell) => {
    if (cell === null) return "";
    if (typeof cell === "string") {
      // Escape pipes and newlines in cell content
      return cell.replace(/\|/g, "\\|").replace(/\n/g, " ");
    }
    return String(cell);
  });
  const dataRow = `| ${cells.join(" | ")} |`;

  return [headerRow, separatorRow, dataRow].join("\n");
};

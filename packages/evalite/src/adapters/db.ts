import type * as BetterSqlite3 from "better-sqlite3";
import Database from "better-sqlite3";
import type { Evalite } from "../types.js";

export type SQLiteDatabase = BetterSqlite3.Database;

export const createDatabase = (url: string): BetterSqlite3.Database => {
  const db: BetterSqlite3.Database = new Database(url);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runType TEXT NOT NULL, -- full, partial
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS evals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      filepath TEXT NOT NULL,
      duration INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    );

    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eval_id INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      input TEXT NOT NULL, -- JSON
      output TEXT NOT NULL, -- JSON
      expected TEXT, -- JSON
      col_order INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (eval_id) REFERENCES evals(id)
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      score FLOAT NOT NULL,
      description TEXT,
      metadata TEXT, -- JSON
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (result_id) REFERENCES results(id)
    );

    CREATE TABLE IF NOT EXISTS traces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_id INTEGER NOT NULL,
      input TEXT NOT NULL, -- JSON
      output TEXT NOT NULL, -- JSON
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      prompt_tokens INTEGER,
      completion_tokens INTEGER,
      col_order INTEGER NOT NULL,
      FOREIGN KEY (result_id) REFERENCES results(id)
    );
  `);

  // Add status key to evals table
  try {
    db.exec(
      `ALTER TABLE evals ADD COLUMN status TEXT NOT NULL DEFAULT 'success';`
    );
  } catch (e) {}

  // Add status key to results table
  try {
    db.exec(
      `ALTER TABLE results ADD COLUMN status TEXT NOT NULL DEFAULT 'success';`
    );
  } catch (e) {}

  // Add rendered_columns key to results table
  try {
    db.exec(`ALTER TABLE results ADD COLUMN rendered_columns TEXT`);
  } catch (e) {}

  // Rename prompt_tokens/completion_tokens to input_tokens/output_tokens and add total_tokens
  try {
    db.exec(`
      ALTER TABLE traces RENAME COLUMN prompt_tokens TO input_tokens;
      ALTER TABLE traces RENAME COLUMN completion_tokens TO output_tokens;
      ALTER TABLE traces ADD COLUMN total_tokens INTEGER;
    `);
  } catch (e) {}

  // Add variant_name and variant_group columns to evals table
  try {
    db.exec(`ALTER TABLE evals ADD COLUMN variant_name TEXT`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE evals ADD COLUMN variant_group TEXT`);
  } catch (e) {}

  return db;
};

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

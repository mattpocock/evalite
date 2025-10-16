import type * as BetterSqlite3 from "better-sqlite3";
import Database from "better-sqlite3";
import type { Db } from "../db.js";
import type { Evalite } from "../types.js";
import {
  createDatabase as createSqliteDatabase,
  createEvalIfNotExists as dbCreateEvalIfNotExists,
  createRun as dbCreateRun,
  findResultByEvalIdAndOrder as dbFindResultByEvalIdAndOrder,
  getAllResultsForEval as dbGetAllResultsForEval,
  getAverageScoresFromResults as dbGetAverageScoresFromResults,
  getEvalByName as dbGetEvalByName,
  getEvals as dbGetEvals,
  getEvalsAsRecord as dbGetEvalsAsRecord,
  getEvalsAverageScores as dbGetEvalsAverageScores,
  getHistoricalEvalsWithScoresByName as dbGetHistoricalEvalsWithScoresByName,
  getMostRecentRun as dbGetMostRecentRun,
  getPreviousCompletedEval as dbGetPreviousCompletedEval,
  getResults as dbGetResults,
  getScores as dbGetScores,
  getTraces as dbGetTraces,
  insertResult as dbInsertResult,
  insertScore as dbInsertScore,
  insertTrace as dbInsertTrace,
  updateEvalStatusAndDuration as dbUpdateEvalStatusAndDuration,
  updateResult as dbUpdateResult,
} from "../db.js";
import type { EvaliteAdapter } from "./types.js";

export class SqliteAdapter implements EvaliteAdapter {
  private db: BetterSqlite3.Database;

  private constructor(db: BetterSqlite3.Database) {
    this.db = db;
  }

  /**
   * Create a new SQLite adapter
   */
  static create(location: string): SqliteAdapter {
    const db = createSqliteDatabase(location);
    return new SqliteAdapter(db);
  }

  createRun(runType: Evalite.RunType): number | bigint {
    return dbCreateRun({ db: this.db, runType });
  }

  createEvalIfNotExists(opts: {
    runId: number | bigint;
    name: string;
    filepath: string;
    variantName?: string;
    variantGroup?: string;
  }): number | bigint {
    return dbCreateEvalIfNotExists({
      db: this.db,
      ...opts,
    });
  }

  insertResult(opts: {
    evalId: number | bigint;
    order: number;
    input: unknown;
    expected: unknown;
    output: unknown;
    duration: number;
    status: string;
    renderedColumns: unknown;
  }): number | bigint {
    return dbInsertResult({
      db: this.db,
      evalId: opts.evalId,
      order: opts.order,
      input: opts.input,
      expected: opts.expected,
      output: opts.output,
      duration: opts.duration,
      status: opts.status,
      renderedColumns: opts.renderedColumns,
    });
  }

  updateResult(opts: {
    resultId: number | bigint;
    output: unknown;
    duration: number;
    input: unknown;
    expected: unknown;
    status: string;
    renderedColumns: unknown;
  }): void {
    dbUpdateResult({
      db: this.db,
      ...opts,
    });
  }

  insertScore(opts: {
    resultId: number | bigint;
    name: string;
    score: number;
    description?: string;
    metadata: unknown;
  }): void {
    dbInsertScore({
      db: this.db,
      resultId: opts.resultId,
      name: opts.name,
      score: opts.score,
      description: opts.description,
      metadata: opts.metadata,
    });
  }

  insertTrace(opts: {
    resultId: number | bigint;
    input: unknown;
    output: unknown;
    start: number;
    end: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    order: number;
  }): void {
    dbInsertTrace({
      db: this.db,
      resultId: opts.resultId,
      input: opts.input,
      output: opts.output,
      start: opts.start,
      end: opts.end,
      inputTokens: opts.inputTokens,
      outputTokens: opts.outputTokens,
      totalTokens: opts.totalTokens,
      order: opts.order,
    });
  }

  updateEvalStatusAndDuration(opts: {
    evalId: number | bigint;
    status: Db.EvalStatus;
  }): void {
    dbUpdateEvalStatusAndDuration({
      db: this.db,
      ...opts,
    });
  }

  getEvals(runIds: number[], allowedStatuses: Db.EvalStatus[]): Db.Eval[] {
    return dbGetEvals(this.db, runIds, allowedStatuses);
  }

  getResults(evalIds: number[]): Db.Result[] {
    return dbGetResults(this.db, evalIds);
  }

  getScores(resultIds: number[]): Db.Score[] {
    return dbGetScores(this.db, resultIds);
  }

  getTraces(resultIds: number[]): Db.Trace[] {
    return dbGetTraces(this.db, resultIds);
  }

  getMostRecentRun(runType: Evalite.RunType): Db.Run | undefined {
    return dbGetMostRecentRun(this.db, runType);
  }

  getPreviousCompletedEval(
    name: string,
    startTime: string
  ): Db.Eval | undefined {
    return dbGetPreviousCompletedEval(this.db, name, startTime);
  }

  getAverageScoresFromResults(
    resultIds: number[]
  ): { result_id: number; average: number }[] {
    return dbGetAverageScoresFromResults(this.db, resultIds);
  }

  getEvalsAverageScores(
    evalIds: number[]
  ): { eval_id: number; average: number }[] {
    return dbGetEvalsAverageScores(this.db, evalIds);
  }

  getEvalByName(opts: {
    name: string;
    timestamp?: string;
    statuses?: Db.EvalStatus[];
  }): Db.Eval | undefined {
    return dbGetEvalByName(this.db, opts);
  }

  getHistoricalEvalsWithScoresByName(
    name: string
  ): (Db.Eval & { average_score: number })[] {
    return dbGetHistoricalEvalsWithScoresByName(this.db, name);
  }

  findResultByEvalIdAndOrder(opts: {
    evalId: number | bigint;
    order: number;
  }): number | undefined {
    return dbFindResultByEvalIdAndOrder({
      db: this.db,
      ...opts,
    });
  }

  getAllResultsForEval(evalId: number | bigint): Array<{
    id: number;
    status: Evalite.ResultStatus;
  }> {
    return dbGetAllResultsForEval({
      db: this.db,
      evalId,
    });
  }

  async getEvalsAsRecord(): Promise<Record<string, any[]>> {
    return dbGetEvalsAsRecord(this.db);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

/**
 * Create a new SQLite adapter
 * @param location - Path to the SQLite database file
 * @returns A new SqliteAdapter instance
 */
export const createSqliteAdapter = (location: string): SqliteAdapter => {
  return SqliteAdapter.create(location);
};

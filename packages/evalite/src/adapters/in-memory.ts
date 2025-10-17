import type { Evalite } from "../types.js";
import type { EvaliteAdapter } from "./types.js";

export type { EvaliteAdapter };

export class InMemoryAdapter implements EvaliteAdapter {
  private runsStore = new Map<number, Evalite.Adapter.Entities.Run>();
  private evalsStore = new Map<number, Evalite.Adapter.Entities.Eval>();
  private resultsStore = new Map<number, Evalite.Adapter.Entities.Result>();
  private scoresStore = new Map<number, Evalite.Adapter.Entities.Score>();
  private tracesStore = new Map<number, Evalite.Adapter.Entities.Trace>();

  private nextRunId = 1;
  private nextEvalId = 1;
  private nextResultId = 1;
  private nextScoreId = 1;
  private nextTraceId = 1;

  private constructor() {}

  /**
   * Create a new in-memory adapter
   */
  static create(): InMemoryAdapter {
    return new InMemoryAdapter();
  }

  runs = {
    create: async (
      opts: Evalite.Adapter.Runs.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Run> => {
      const run: Evalite.Adapter.Entities.Run = {
        id: this.nextRunId++,
        runType: opts.runType,
        created_at: new Date().toISOString(),
      };
      this.runsStore.set(run.id, run);
      return run;
    },

    getMany: async (
      opts?: Evalite.Adapter.Runs.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Run[]> => {
      let runs = Array.from(this.runsStore.values());

      if (opts?.ids && opts.ids.length > 0) {
        runs = runs.filter((r) => opts.ids!.includes(r.id));
      }

      if (opts?.runType) {
        runs = runs.filter((r) => r.runType === opts.runType);
      }

      if (opts?.createdAt) {
        runs = runs.filter((r) => r.created_at === opts.createdAt);
      }

      if (opts?.createdAfter) {
        runs = runs.filter((r) => r.created_at > opts.createdAfter!);
      }

      if (opts?.createdBefore) {
        runs = runs.filter((r) => r.created_at < opts.createdBefore!);
      }

      const orderBy = opts?.orderBy ?? "created_at";
      const orderDirection = opts?.orderDirection ?? "desc";

      runs.sort((a, b) => {
        const aVal = a[orderBy as keyof typeof a];
        const bVal = b[orderBy as keyof typeof b];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return orderDirection === "desc" ? -comparison : comparison;
      });

      if (opts?.limit) {
        runs = runs.slice(0, opts.limit);
      }

      return runs;
    },
  };

  evals = {
    createOrGet: async (
      opts: Evalite.Adapter.Evals.CreateOrGetOpts
    ): Promise<Evalite.Adapter.Entities.Eval> => {
      // Check if eval exists with same runId, name, and filepath
      const existing = Array.from(this.evalsStore.values()).find(
        (e) =>
          e.run_id === opts.runId &&
          e.name === opts.name &&
          e.filepath === opts.filepath &&
          e.variant_name === opts.variantName &&
          e.variant_group === opts.variantGroup
      );

      if (existing) {
        return existing;
      }

      const evalEntity: Evalite.Adapter.Entities.Eval = {
        id: this.nextEvalId++,
        run_id: opts.runId,
        name: opts.name,
        filepath: opts.filepath,
        variant_name: opts.variantName,
        variant_group: opts.variantGroup,
        status: "running",
        duration: 0,
        created_at: new Date().toISOString(),
      };

      this.evalsStore.set(evalEntity.id, evalEntity);
      return evalEntity;
    },

    update: async (
      opts: Evalite.Adapter.Evals.UpdateOpts
    ): Promise<Evalite.Adapter.Entities.Eval> => {
      const evalEntity = this.evalsStore.get(opts.id);
      if (!evalEntity) {
        throw new Error(`Eval with id ${opts.id} not found`);
      }

      const updated = {
        ...evalEntity,
        status: opts.status,
        duration:
          opts.status !== "running"
            ? Date.now() - new Date(evalEntity.created_at).getTime()
            : 0,
      };

      this.evalsStore.set(opts.id, updated);
      return updated;
    },

    getMany: async (
      opts?: Evalite.Adapter.Evals.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Eval[]> => {
      let evals = Array.from(this.evalsStore.values());

      if (opts?.ids && opts.ids.length > 0) {
        evals = evals.filter((e) => opts.ids!.includes(e.id));
      }

      if (opts?.runIds && opts.runIds.length > 0) {
        evals = evals.filter((e) => opts.runIds!.includes(e.run_id));
      }

      if (opts?.name) {
        evals = evals.filter((e) => e.name === opts.name);
      }

      if (opts?.statuses && opts.statuses.length > 0) {
        evals = evals.filter((e) => opts.statuses!.includes(e.status));
      }

      if (opts?.createdAt) {
        evals = evals.filter((e) => e.created_at === opts.createdAt);
      }

      if (opts?.createdAfter) {
        evals = evals.filter((e) => e.created_at > opts.createdAfter!);
      }

      if (opts?.createdBefore) {
        evals = evals.filter((e) => e.created_at < opts.createdBefore!);
      }

      const orderBy = opts?.orderBy ?? "created_at";
      const orderDirection = opts?.orderDirection ?? "desc";

      evals.sort((a, b) => {
        const aVal = a[orderBy as keyof typeof a]!;
        const bVal = b[orderBy as keyof typeof b]!;
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return orderDirection === "desc" ? -comparison : comparison;
      });

      if (opts?.limit) {
        evals = evals.slice(0, opts.limit);
      }

      return evals;
    },
  };

  results = {
    create: async (
      opts: Evalite.Adapter.Results.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Result> => {
      const result: Evalite.Adapter.Entities.Result = {
        id: this.nextResultId++,
        eval_id: opts.evalId,
        col_order: opts.order,
        input: JSON.stringify(opts.input),
        expected: JSON.stringify(opts.expected),
        output: JSON.stringify(opts.output),
        duration: opts.duration,
        status: opts.status,
        rendered_columns: JSON.stringify(opts.renderedColumns),
        created_at: new Date().toISOString(),
      };

      this.resultsStore.set(result.id, result);
      return {
        ...result,
        input: opts.input,
        expected: opts.expected,
        output: opts.output,
        rendered_columns: opts.renderedColumns,
      };
    },

    update: async (
      opts: Evalite.Adapter.Results.UpdateOpts
    ): Promise<Evalite.Adapter.Entities.Result> => {
      const result = this.resultsStore.get(opts.id);
      if (!result) {
        throw new Error(`Result with id ${opts.id} not found`);
      }

      const updated: Evalite.Adapter.Entities.Result = {
        ...result,
        ...(opts.input !== undefined && {
          input: JSON.stringify(opts.input),
        }),
        ...(opts.expected !== undefined && {
          expected: JSON.stringify(opts.expected),
        }),
        ...(opts.output !== undefined && {
          output: JSON.stringify(opts.output),
        }),
        ...(opts.duration !== undefined && { duration: opts.duration }),
        ...(opts.status !== undefined && { status: opts.status }),
        ...(opts.renderedColumns !== undefined && {
          rendered_columns: JSON.stringify(opts.renderedColumns),
        }),
      };

      this.resultsStore.set(opts.id, updated);

      return {
        ...updated,
        input: opts.input ?? JSON.parse(result.input as string),
        expected: opts.expected ?? JSON.parse(result.expected as string),
        output: opts.output ?? JSON.parse(result.output as string),
        rendered_columns:
          opts.renderedColumns ?? JSON.parse(result.rendered_columns as string),
      };
    },

    getMany: async (
      opts?: Evalite.Adapter.Results.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Result[]> => {
      let results = Array.from(this.resultsStore.values());

      if (opts?.ids && opts.ids.length > 0) {
        results = results.filter((r) => opts.ids!.includes(r.id));
      }

      if (opts?.evalIds && opts.evalIds.length > 0) {
        results = results.filter((r) => opts.evalIds!.includes(r.eval_id));
      }

      if (opts?.order !== undefined) {
        results = results.filter((r) => r.col_order === opts.order);
      }

      if (opts?.statuses && opts.statuses.length > 0) {
        results = results.filter((r) => opts.statuses!.includes(r.status));
      }

      results.sort((a, b) => a.col_order - b.col_order);

      return results.map((r) => ({
        ...r,
        input: JSON.parse(r.input as string),
        expected: JSON.parse(r.expected as string),
        output: JSON.parse(r.output as string),
        rendered_columns: JSON.parse(r.rendered_columns as string),
      }));
    },

    getAverageScores: async (
      opts: Evalite.Adapter.Results.GetAverageScoresOpts
    ): Promise<Array<{ result_id: number; average: number }>> => {
      const scores = Array.from(this.scoresStore.values()).filter((s) =>
        opts.ids.includes(s.result_id)
      );

      const grouped = new Map<number, number[]>();
      for (const score of scores) {
        if (!grouped.has(score.result_id)) {
          grouped.set(score.result_id, []);
        }
        grouped.get(score.result_id)!.push(score.score);
      }

      return Array.from(grouped.entries()).map(([result_id, scoreVals]) => ({
        result_id,
        average:
          scoreVals.reduce((sum, val) => sum + val, 0) / scoreVals.length,
      }));
    },
  };

  scores = {
    create: async (
      opts: Evalite.Adapter.Scores.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Score> => {
      const score: Evalite.Adapter.Entities.Score = {
        id: this.nextScoreId++,
        result_id: opts.resultId,
        name: opts.name,
        score: opts.score,
        description: opts.description,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
        created_at: new Date().toISOString(),
      };

      this.scoresStore.set(score.id, score);

      return {
        ...score,
        metadata: opts.metadata ?? null,
      };
    },

    getMany: async (
      opts?: Evalite.Adapter.Scores.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Score[]> => {
      let scores = Array.from(this.scoresStore.values());

      if (opts?.ids && opts.ids.length > 0) {
        scores = scores.filter((s) => opts.ids!.includes(s.id));
      }

      if (opts?.resultIds && opts.resultIds.length > 0) {
        scores = scores.filter((s) => opts.resultIds!.includes(s.result_id));
      }

      return scores.map((s) => ({
        ...s,
        metadata: s.metadata ? JSON.parse(s.metadata as string) : null,
      }));
    },
  };

  traces = {
    create: async (
      opts: Evalite.Adapter.Traces.CreateOpts
    ): Promise<Evalite.Adapter.Entities.Trace> => {
      const trace: Evalite.Adapter.Entities.Trace = {
        id: this.nextTraceId++,
        result_id: opts.resultId,
        input: JSON.stringify(opts.input),
        output: JSON.stringify(opts.output),
        start_time: opts.start,
        end_time: opts.end,
        input_tokens: opts.inputTokens ?? undefined,
        output_tokens: opts.outputTokens ?? undefined,
        total_tokens: opts.totalTokens ?? undefined,
        col_order: opts.order,
      };

      this.tracesStore.set(trace.id, trace);

      return {
        ...trace,
        input: opts.input,
        output: opts.output,
      };
    },

    getMany: async (
      opts?: Evalite.Adapter.Traces.GetManyOpts
    ): Promise<Evalite.Adapter.Entities.Trace[]> => {
      let traces = Array.from(this.tracesStore.values());

      if (opts?.ids && opts.ids.length > 0) {
        traces = traces.filter((t) => opts.ids!.includes(t.id));
      }

      if (opts?.resultIds && opts.resultIds.length > 0) {
        traces = traces.filter((t) => opts.resultIds!.includes(t.result_id));
      }

      traces.sort((a, b) => a.col_order - b.col_order);

      return traces.map((t) => ({
        ...t,
        input: JSON.parse(t.input as string),
        output: JSON.parse(t.output as string),
      }));
    },
  };

  async close(): Promise<void> {
    // Nothing to close for in-memory
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

/**
 * Create a new in-memory adapter
 * @returns A new InMemoryAdapter instance
 */
export const createInMemoryAdapter = (): InMemoryAdapter => {
  return InMemoryAdapter.create();
};

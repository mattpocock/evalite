import type { Evalite } from "../types.js";

export class InMemoryStorage implements Evalite.Storage {
  private runsStore = new Map<number, Evalite.Storage.Entities.Run>();
  private suitesStore = new Map<number, Evalite.Storage.Entities.Suite>();
  private evalsStore = new Map<number, Evalite.Storage.Entities.Eval>();
  private scoresStore = new Map<number, Evalite.Storage.Entities.Score>();
  private tracesStore = new Map<number, Evalite.Storage.Entities.Trace>();

  private nextRunId = 1;
  private nextSuiteId = 1;
  private nextEvalId = 1;
  private nextScoreId = 1;
  private nextTraceId = 1;

  private constructor() {}

  /**
   * Create a new in-memory storage
   */
  static create(): InMemoryStorage {
    return new InMemoryStorage();
  }

  runs = {
    create: async (
      opts: Evalite.Storage.Runs.CreateOpts
    ): Promise<Evalite.Storage.Entities.Run> => {
      const run: Evalite.Storage.Entities.Run = {
        id: this.nextRunId++,
        runType: opts.runType,
        created_at: new Date().toISOString(),
      };
      this.runsStore.set(run.id, run);
      return run;
    },

    getMany: async (
      opts?: Evalite.Storage.Runs.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Run[]> => {
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

  suites = {
    create: async (
      opts: Evalite.Storage.Suites.CreateOpts
    ): Promise<Evalite.Storage.Entities.Suite> => {
      const suite: Evalite.Storage.Entities.Suite = {
        id: this.nextSuiteId++,
        run_id: opts.runId,
        name: opts.name,
        filepath: opts.filepath,
        variant_name: opts.variantName,
        variant_group: opts.variantGroup,
        status: "running",
        duration: 0,
        created_at: new Date().toISOString(),
      };

      this.suitesStore.set(suite.id, suite);
      return suite;
    },

    update: async (
      opts: Evalite.Storage.Suites.UpdateOpts
    ): Promise<Evalite.Storage.Entities.Suite> => {
      const suite = this.suitesStore.get(opts.id);
      if (!suite) {
        throw new Error(`Eval with id ${opts.id} not found`);
      }

      const updated = {
        ...suite,
        status: opts.status,
        duration: 0,
      };

      this.suitesStore.set(opts.id, updated);
      return updated;
    },

    getMany: async (
      opts?: Evalite.Storage.Suites.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Suite[]> => {
      let suites = Array.from(this.suitesStore.values());

      if (opts?.ids && opts.ids.length > 0) {
        suites = suites.filter((e) => opts.ids!.includes(e.id));
      }

      if (opts?.runIds && opts.runIds.length > 0) {
        suites = suites.filter((e) => opts.runIds!.includes(e.run_id));
      }

      if (opts?.name) {
        suites = suites.filter((e) => e.name === opts.name);
      }

      if (opts?.statuses && opts.statuses.length > 0) {
        suites = suites.filter((e) => opts.statuses!.includes(e.status));
      }

      if (opts?.createdAt) {
        suites = suites.filter((e) => e.created_at === opts.createdAt);
      }

      if (opts?.createdAfter) {
        suites = suites.filter((e) => e.created_at > opts.createdAfter!);
      }

      if (opts?.createdBefore) {
        suites = suites.filter((e) => e.created_at < opts.createdBefore!);
      }

      const orderBy = opts?.orderBy ?? "created_at";
      const orderDirection = opts?.orderDirection ?? "desc";

      suites.sort((a, b) => {
        const aVal = a[orderBy as keyof typeof a]!;
        const bVal = b[orderBy as keyof typeof b]!;
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return orderDirection === "desc" ? -comparison : comparison;
      });

      if (opts?.limit) {
        suites = suites.slice(0, opts.limit);
      }

      return suites;
    },
  };

  evals = {
    create: async (
      opts: Evalite.Storage.Evals.CreateOpts
    ): Promise<Evalite.Storage.Entities.Eval> => {
      const _eval: Evalite.Storage.Entities.Eval = {
        id: this.nextEvalId++,
        suite_id: opts.suiteId,
        col_order: opts.order,
        input: JSON.stringify(opts.input),
        expected: JSON.stringify(opts.expected),
        output: JSON.stringify(opts.output),
        duration: opts.duration,
        status: opts.status,
        rendered_columns: JSON.stringify(opts.renderedColumns),
        trial_index: opts.trialIndex,
        created_at: new Date().toISOString(),
      };

      this.evalsStore.set(_eval.id, _eval);
      return {
        ..._eval,
        input: opts.input,
        expected: opts.expected,
        output: opts.output,
        rendered_columns: opts.renderedColumns,
      };
    },

    update: async (
      opts: Evalite.Storage.Evals.UpdateOpts
    ): Promise<Evalite.Storage.Entities.Eval> => {
      const _eval = this.evalsStore.get(opts.id);
      if (!_eval) {
        throw new Error(`Result with id ${opts.id} not found`);
      }

      const updated: Evalite.Storage.Entities.Eval = {
        ..._eval,
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
        ...(opts.trialIndex !== undefined && { trial_index: opts.trialIndex }),
      };

      this.evalsStore.set(opts.id, updated);

      return {
        ...updated,
        input: opts.input ?? JSON.parse(_eval.input as string),
        expected: opts.expected ?? JSON.parse(_eval.expected as string),
        output: opts.output ?? JSON.parse(_eval.output as string),
        rendered_columns:
          opts.renderedColumns ?? JSON.parse(_eval.rendered_columns as string),
      };
    },

    getMany: async (
      opts?: Evalite.Storage.Evals.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Eval[]> => {
      let evals = Array.from(this.evalsStore.values());

      if (opts?.ids && opts.ids.length > 0) {
        evals = evals.filter((e) => opts.ids!.includes(e.id));
      }

      if (opts?.suiteIds && opts.suiteIds.length > 0) {
        evals = evals.filter((e) => opts.suiteIds!.includes(e.suite_id));
      }

      if (opts?.order !== undefined) {
        evals = evals.filter((e) => e.col_order === opts.order);
      }

      if (opts?.statuses && opts.statuses.length > 0) {
        evals = evals.filter((e) => opts.statuses!.includes(e.status));
      }

      evals.sort((a, b) => a.col_order - b.col_order);

      return evals.map((e) => ({
        ...e,
        input: JSON.parse(e.input as string),
        expected: JSON.parse(e.expected as string),
        output: JSON.parse(e.output as string),
        rendered_columns: JSON.parse(e.rendered_columns as string),
      }));
    },
  };

  scores = {
    create: async (
      opts: Evalite.Storage.Scores.CreateOpts
    ): Promise<Evalite.Storage.Entities.Score> => {
      const score: Evalite.Storage.Entities.Score = {
        id: this.nextScoreId++,
        eval_id: opts.evalId,
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
      opts?: Evalite.Storage.Scores.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Score[]> => {
      let scores = Array.from(this.scoresStore.values());

      if (opts?.ids && opts.ids.length > 0) {
        scores = scores.filter((s) => opts.ids!.includes(s.id));
      }

      if (opts?.evalIds && opts.evalIds.length > 0) {
        scores = scores.filter((s) => opts.evalIds!.includes(s.eval_id));
      }

      return scores.map((s) => ({
        ...s,
        metadata: s.metadata ? JSON.parse(s.metadata as string) : null,
      }));
    },
  };

  traces = {
    create: async (
      opts: Evalite.Storage.Traces.CreateOpts
    ): Promise<Evalite.Storage.Entities.Trace> => {
      const trace: Evalite.Storage.Entities.Trace = {
        id: this.nextTraceId++,
        eval_id: opts.evalId,
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
      opts?: Evalite.Storage.Traces.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Trace[]> => {
      let traces = Array.from(this.tracesStore.values());

      if (opts?.ids && opts.ids.length > 0) {
        traces = traces.filter((t) => opts.ids!.includes(t.id));
      }

      if (opts?.evalIds && opts.evalIds.length > 0) {
        traces = traces.filter((t) => opts.evalIds!.includes(t.eval_id));
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
 * Create a new in-memory storage
 * @returns A new InMemoryStorage instance
 */
export const createInMemoryStorage = (): InMemoryStorage => {
  return InMemoryStorage.create();
};

import type { Evalite } from "./types.js";
import type { Experiment, Span } from "braintrust";
import { init, _internalGetGlobalState } from "braintrust";

interface BraintrustStorageOptions {
  /**
   * The Braintrust project name (required)
   */
  projectName: string;
  /**
   * Optional experiment name. If not provided, a timestamp will be used.
   */
  experimentName?: string;
  /**
   * Optional API key. If not provided, will use BRAINTRUST_API_KEY env var.
   */
  apiKey?: string;
  /**
   * Optional app URL for Braintrust (defaults to https://www.braintrust.dev)
   */
  appUrl?: string;
}

/**
 * In-memory entity storage for local queries.
 * Braintrust doesn't provide direct query APIs during logging,
 * so we maintain a local cache of entities.
 */
interface EntityStore {
  runs: Map<number, Evalite.Storage.Entities.Run>;
  suites: Map<number, Evalite.Storage.Entities.Suite>;
  evals: Map<number, Evalite.Storage.Entities.Eval>;
  scores: Map<number, Evalite.Storage.Entities.Score>;
  traces: Map<number, Evalite.Storage.Entities.Trace>;
  cache: Map<string, { value: unknown; duration: number; created_at: number }>;
}

/**
 * Map Evalite entity IDs to Braintrust Span objects
 */
interface SpanMap {
  evals: Map<number, Span>; // eval ID -> Braintrust span
  traces: Map<number, Span>; // trace ID -> Braintrust span
}

export class BraintrustStorage implements Evalite.Storage {
  private experiment: Experiment | null = null;
  private experimentUrl: string | null = null;
  private options: BraintrustStorageOptions;
  private entityStore: EntityStore;
  private spanMap: SpanMap;
  private nextId = {
    run: 1,
    suite: 1,
    eval: 1,
    score: 1,
    trace: 1,
  };

  private constructor(options: BraintrustStorageOptions) {
    this.options = options;
    this.entityStore = {
      runs: new Map(),
      suites: new Map(),
      evals: new Map(),
      scores: new Map(),
      traces: new Map(),
      cache: new Map(),
    };
    this.spanMap = {
      evals: new Map(),
      traces: new Map(),
    };
  }

  static create(options: BraintrustStorageOptions): BraintrustStorage {
    return new BraintrustStorage(options);
  }

  /**
   * Get the Braintrust experiment URL for viewing results
   */
  getExperimentUrl(): string | null {
    return this.experimentUrl;
  }

  /**
   * Initialize the Braintrust experiment (lazy initialization on first run)
   */
  private async initExperiment(): Promise<Experiment> {
    if (!this.experiment) {
      const experimentName =
        this.options.experimentName || `evalite-${new Date().toISOString()}`;

      this.experiment = init(this.options.projectName, {
        experiment: experimentName,
        apiKey: this.options.apiKey,
        appUrl: this.options.appUrl,
      });

      // Get the experiment URL from Braintrust's summarize() method
      // This ensures we use the correct URL format that Braintrust expects
      try {
        const summary = await this.experiment.summarize({
          summarizeScores: false, // We only need the URL, not scores
        });
        this.experimentUrl = summary.experimentUrl || null;
      } catch (e) {
        // If summarize fails (e.g., no API key), don't set URL
        console.warn("Could not get experiment URL from Braintrust:", e);
        this.experimentUrl = null;
      }
    }

    return this.experiment;
  }

  runs = {
    create: async (
      opts: Evalite.Storage.Runs.CreateOpts
    ): Promise<Evalite.Storage.Entities.Run> => {
      // Initialize Braintrust experiment when first run is created
      await this.initExperiment();

      const run: Evalite.Storage.Entities.Run = {
        id: this.nextId.run++,
        runType: opts.runType,
        created_at: new Date().toISOString(),
      };

      this.entityStore.runs.set(run.id, run);
      return run;
    },

    getMany: async (
      opts?: Evalite.Storage.Runs.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Run[]> => {
      let runs = Array.from(this.entityStore.runs.values());

      // Apply filters
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

      // Apply sorting
      const orderBy = opts?.orderBy ?? "created_at";
      const orderDirection = opts?.orderDirection ?? "desc";
      runs.sort((a, b) => {
        const aVal = a[orderBy];
        const bVal = b[orderBy];
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return orderDirection === "asc" ? comparison : -comparison;
      });

      // Apply limit
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
      // Initialize experiment but don't create a span for the suite
      // Suites are just organizational units in Evalite - each eval will be a row
      await this.initExperiment();

      const suite: Evalite.Storage.Entities.Suite = {
        id: this.nextId.suite++,
        run_id: opts.runId,
        name: opts.name,
        status: "running",
        filepath: opts.filepath,
        duration: 0,
        created_at: new Date().toISOString(),
        variant_name: opts.variantName,
        variant_group: opts.variantGroup,
      };

      this.entityStore.suites.set(suite.id, suite);
      return suite;
    },

    update: async (
      opts: Evalite.Storage.Suites.UpdateOpts
    ): Promise<Evalite.Storage.Entities.Suite> => {
      const suite = this.entityStore.suites.get(opts.id);
      if (!suite) {
        throw new Error(`Suite with id ${opts.id} not found`);
      }

      suite.status = opts.status;
      this.entityStore.suites.set(opts.id, suite);

      return suite;
    },

    getMany: async (
      opts?: Evalite.Storage.Suites.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Suite[]> => {
      let suites = Array.from(this.entityStore.suites.values());

      // Apply filters
      if (opts?.ids && opts.ids.length > 0) {
        suites = suites.filter((s) => opts.ids!.includes(s.id));
      }

      if (opts?.runIds && opts.runIds.length > 0) {
        suites = suites.filter((s) => opts.runIds!.includes(s.run_id));
      }

      if (opts?.name) {
        suites = suites.filter((s) => s.name === opts.name);
      }

      if (opts?.statuses && opts.statuses.length > 0) {
        suites = suites.filter((s) => opts.statuses!.includes(s.status));
      }

      if (opts?.createdAt) {
        suites = suites.filter((s) => s.created_at === opts.createdAt);
      }

      if (opts?.createdAfter) {
        suites = suites.filter((s) => s.created_at > opts.createdAfter!);
      }

      if (opts?.createdBefore) {
        suites = suites.filter((s) => s.created_at < opts.createdBefore!);
      }

      // Apply sorting
      const orderBy = opts?.orderBy ?? "created_at";
      const orderDirection = opts?.orderDirection ?? "desc";
      suites.sort((a, b) => {
        const aVal = a[orderBy];
        const bVal = b[orderBy];
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return orderDirection === "asc" ? comparison : -comparison;
      });

      // Apply limit
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
      const experiment = await this.initExperiment();

      const eval_: Evalite.Storage.Entities.Eval = {
        id: this.nextId.eval++,
        suite_id: opts.suiteId,
        duration: opts.duration,
        input: opts.input,
        output: opts.output,
        expected: opts.expected,
        created_at: new Date().toISOString(),
        col_order: opts.order,
        status: opts.status,
        rendered_columns: opts.renderedColumns,
        trial_index: opts.trialIndex,
      };

      // Get the suite to include its metadata
      const suite = this.entityStore.suites.get(opts.suiteId);

      // Create a top-level span for each eval (test case)
      // Each eval becomes a row in the Braintrust experiment
      const span = experiment.startSpan({
        name: suite?.name
          ? `${suite.name} - Test ${opts.order}`
          : `Test ${opts.order}`,
        type: "eval",
        spanAttributes: {
          // Include suite metadata so we can filter/group by suite in Braintrust
          suite_name: suite?.name,
          filepath: suite?.filepath,
          variant_name: suite?.variant_name,
          variant_group: suite?.variant_group,
          trial_index: opts.trialIndex,
          test_index: opts.order,
        },
      });

      // Store the span object
      this.spanMap.evals.set(eval_.id, span);

      this.entityStore.evals.set(eval_.id, eval_);
      return eval_;
    },

    update: async (
      opts: Evalite.Storage.Evals.UpdateOpts
    ): Promise<Evalite.Storage.Entities.Eval> => {
      await this.initExperiment();
      const eval_ = this.entityStore.evals.get(opts.id);
      if (!eval_) {
        throw new Error(`Eval with id ${opts.id} not found`);
      }

      // Update the eval entity
      eval_.output = opts.output;
      eval_.duration = opts.duration;
      eval_.input = opts.input;
      eval_.expected = opts.expected;
      eval_.status = opts.status;
      eval_.rendered_columns = opts.renderedColumns;
      eval_.trial_index = opts.trialIndex;

      // Get the existing span and log the updated data
      const span = this.spanMap.evals.get(opts.id);
      if (span) {
        span.log({
          input: opts.input,
          output: opts.output,
          expected: opts.expected,
          metadata: {
            duration: opts.duration,
            status: opts.status,
            rendered_columns: opts.renderedColumns,
          },
        });

        // End the span only if the eval is finished
        if (opts.status !== "running") {
          span.end();
        }
      }

      this.entityStore.evals.set(opts.id, eval_);
      return eval_;
    },

    getMany: async (
      opts?: Evalite.Storage.Evals.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Eval[]> => {
      let evals = Array.from(this.entityStore.evals.values());

      // Apply filters
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

      // Sort by col_order
      evals.sort((a, b) => a.col_order - b.col_order);

      return evals;
    },
  };

  scores = {
    create: async (
      opts: Evalite.Storage.Scores.CreateOpts
    ): Promise<Evalite.Storage.Entities.Score> => {
      await this.initExperiment();

      const score: Evalite.Storage.Entities.Score = {
        id: this.nextId.score++,
        eval_id: opts.evalId,
        name: opts.name,
        score: opts.score,
        description: opts.description,
        metadata: opts.metadata,
        created_at: new Date().toISOString(),
      };

      // Get the eval's span and log the score to it
      const span = this.spanMap.evals.get(opts.evalId);
      if (span) {
        // Add scores to the span
        span.log({
          scores: {
            [opts.name]: opts.score,
          },
        });
      }

      this.entityStore.scores.set(score.id, score);
      return score;
    },

    getMany: async (
      opts?: Evalite.Storage.Scores.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Score[]> => {
      let scores = Array.from(this.entityStore.scores.values());

      // Apply filters
      if (opts?.ids && opts.ids.length > 0) {
        scores = scores.filter((s) => opts.ids!.includes(s.id));
      }

      if (opts?.evalIds && opts.evalIds.length > 0) {
        scores = scores.filter((s) => opts.evalIds!.includes(s.eval_id));
      }

      return scores;
    },
  };

  traces = {
    create: async (
      opts: Evalite.Storage.Traces.CreateOpts
    ): Promise<Evalite.Storage.Entities.Trace> => {
      const experiment = await this.initExperiment();

      const trace: Evalite.Storage.Entities.Trace = {
        id: this.nextId.trace++,
        eval_id: opts.evalId,
        input: opts.input,
        output: opts.output,
        start_time: opts.start,
        end_time: opts.end,
        input_tokens: opts.inputTokens,
        output_tokens: opts.outputTokens,
        total_tokens: opts.totalTokens,
        col_order: opts.order,
      };

      // Get the eval's span as parent
      const parentSpan = this.spanMap.evals.get(opts.evalId);

      // Create a nested span for the trace
      const parent = parentSpan ? await parentSpan.export() : undefined;
      const span = experiment.startSpan({
        name: "LLM Call",
        type: "llm",
        parent,
        // Convert performance.now() timestamp to Unix epoch seconds
        startTime: (performance.timeOrigin + opts.start) / 1000,
      });

      span.log({
        input: opts.input,
        output: opts.output,
        metrics: {
          tokens: opts.totalTokens,
          prompt_tokens: opts.inputTokens,
          completion_tokens: opts.outputTokens,
        },
      });

      this.spanMap.traces.set(trace.id, span);
      // Convert performance.now() timestamp to Unix epoch seconds
      span.end({ endTime: (performance.timeOrigin + opts.end) / 1000 });

      this.entityStore.traces.set(trace.id, trace);
      return trace;
    },

    getMany: async (
      opts?: Evalite.Storage.Traces.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Trace[]> => {
      let traces = Array.from(this.entityStore.traces.values());

      // Apply filters
      if (opts?.ids && opts.ids.length > 0) {
        traces = traces.filter((t) => opts.ids!.includes(t.id));
      }

      if (opts?.evalIds && opts.evalIds.length > 0) {
        traces = traces.filter((t) => opts.evalIds!.includes(t.eval_id));
      }

      // Sort by col_order
      traces.sort((a, b) => a.col_order - b.col_order);

      return traces;
    },
  };

  cache = {
    get: async (
      keyHash: string
    ): Promise<{ value: unknown; duration: number } | null> => {
      const entry = this.entityStore.cache.get(keyHash);
      if (!entry) {
        return null;
      }

      // Check if cache is expired (older than 24 hours)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (entry.created_at < oneDayAgo) {
        this.entityStore.cache.delete(keyHash);
        return null;
      }

      return {
        value: entry.value,
        duration: entry.duration,
      };
    },

    set: async (
      keyHash: string,
      data: { value: unknown; duration: number }
    ): Promise<void> => {
      this.entityStore.cache.set(keyHash, {
        value: data.value,
        duration: data.duration,
        created_at: Date.now(),
      });
    },

    delete: async (keyHash: string): Promise<void> => {
      this.entityStore.cache.delete(keyHash);
    },

    clear: async (): Promise<void> => {
      this.entityStore.cache.clear();
    },
  };

  async close(): Promise<void> {
    if (this.experiment) {
      // Flush any pending logs to Braintrust
      await this.experiment.flush();
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

/**
 * Create a new Braintrust storage backend
 * @param options - Configuration options for Braintrust storage
 * @returns A new BraintrustStorage instance
 */
export const createBraintrustStorage = async (
  options: BraintrustStorageOptions
): Promise<BraintrustStorage> => {
  return BraintrustStorage.create(options);
};

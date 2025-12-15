import type { Evalite } from "./types.js";
import type { Experiment, Span } from "braintrust";
import { init } from "braintrust";
import { InMemoryStorage } from "./storage/in-memory.js";

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
  private localStorage: InMemoryStorage;
  private spanMap: SpanMap;

  private constructor(options: BraintrustStorageOptions) {
    this.options = options;
    this.localStorage = InMemoryStorage.create();
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
      return this.localStorage.runs.create(opts);
    },

    getMany: (
      opts?: Evalite.Storage.Runs.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Run[]> => {
      return this.localStorage.runs.getMany(opts);
    },
  };

  suites = {
    create: async (
      opts: Evalite.Storage.Suites.CreateOpts
    ): Promise<Evalite.Storage.Entities.Suite> => {
      // Initialize experiment but don't create a span for the suite
      // Suites are just organizational units in Evalite - each eval will be a row
      await this.initExperiment();
      return this.localStorage.suites.create(opts);
    },

    update: (
      opts: Evalite.Storage.Suites.UpdateOpts
    ): Promise<Evalite.Storage.Entities.Suite> => {
      return this.localStorage.suites.update(opts);
    },

    getMany: (
      opts?: Evalite.Storage.Suites.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Suite[]> => {
      return this.localStorage.suites.getMany(opts);
    },
  };

  evals = {
    create: async (
      opts: Evalite.Storage.Evals.CreateOpts
    ): Promise<Evalite.Storage.Entities.Eval> => {
      const experiment = await this.initExperiment();

      // Store locally first to get the ID
      const eval_ = await this.localStorage.evals.create(opts);

      // Get the suite to include its metadata
      const suites = await this.localStorage.suites.getMany({
        ids: [opts.suiteId],
      });
      const suite = suites[0];

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

      // Store the span object using the local ID
      this.spanMap.evals.set(eval_.id as number, span);

      return eval_;
    },

    update: async (
      opts: Evalite.Storage.Evals.UpdateOpts
    ): Promise<Evalite.Storage.Entities.Eval> => {
      await this.initExperiment();

      // Update locally
      const eval_ = await this.localStorage.evals.update(opts);

      // Get the existing span and log the updated data
      const span = this.spanMap.evals.get(opts.id as number);
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

      return eval_;
    },

    getMany: (
      opts?: Evalite.Storage.Evals.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Eval[]> => {
      return this.localStorage.evals.getMany(opts);
    },
  };

  scores = {
    create: async (
      opts: Evalite.Storage.Scores.CreateOpts
    ): Promise<Evalite.Storage.Entities.Score> => {
      await this.initExperiment();

      // Store locally
      const score = await this.localStorage.scores.create(opts);

      // Get the eval's span and log the score to it
      const span = this.spanMap.evals.get(opts.evalId as number);
      if (span) {
        // Braintrust requires scores to be between 0 and 1
        // Clamp the score to this range, treating null as 0
        const normalizedScore = Math.max(0, Math.min(1, opts.score ?? 0));

        // Add scores to the span
        span.log({
          scores: {
            [opts.name]: normalizedScore,
          },
        });
      }

      return score;
    },

    getMany: (
      opts?: Evalite.Storage.Scores.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Score[]> => {
      return this.localStorage.scores.getMany(opts);
    },
  };

  traces = {
    create: async (
      opts: Evalite.Storage.Traces.CreateOpts
    ): Promise<Evalite.Storage.Entities.Trace> => {
      const experiment = await this.initExperiment();

      // Store locally first
      const trace = await this.localStorage.traces.create(opts);

      // Get the eval's span as parent
      const parentSpan = this.spanMap.evals.get(opts.evalId as number);

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

      this.spanMap.traces.set(trace.id as number, span);
      // Convert performance.now() timestamp to Unix epoch seconds
      span.end({ endTime: (performance.timeOrigin + opts.end) / 1000 });

      return trace;
    },

    getMany: (
      opts?: Evalite.Storage.Traces.GetManyOpts
    ): Promise<Evalite.Storage.Entities.Trace[]> => {
      return this.localStorage.traces.getMany(opts);
    },
  };

  cache = {
    get: (
      keyHash: string
    ): Promise<{ value: unknown; duration: number } | null> => {
      return this.localStorage.cache.get(keyHash);
    },

    set: (
      keyHash: string,
      data: { value: unknown; duration: number }
    ): Promise<void> => {
      return this.localStorage.cache.set(keyHash, data);
    },

    delete: (keyHash: string): Promise<void> => {
      return this.localStorage.cache.delete(keyHash);
    },

    clear: (): Promise<void> => {
      return this.localStorage.cache.clear();
    },
  };

  async close(): Promise<void> {
    if (this.experiment) {
      // Flush any pending logs to Braintrust
      await this.experiment.flush();
    }
    await this.localStorage.close();
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

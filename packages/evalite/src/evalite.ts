import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { describe, inject, it } from "vitest";
import { reportTraceLocalStorage } from "./traces.js";
import { writeFileQueueLocalStorage } from "./write-file-queue-local-storage.js";
import { createEvaliteFileIfNeeded } from "./utils.js";
import type { Evalite } from "./types.js";
import { FILES_LOCATION } from "./backend-only-constants.js";
import { createScorer } from "./index.js";
import { serializeAnnotation } from "./reporter/events.js";
import {
  cacheContextLocalStorage,
  reportCacheHitLocalStorage,
} from "./cache.js";

const makeSerializable = (obj: unknown): unknown => {
  try {
    structuredClone(obj);
    return obj; // Already serializable, return as-is
  } catch {
    // Use JSON stringify/parse to handle non-serializable values
    return JSON.parse(
      JSON.stringify(obj, (key, value) => {
        if (typeof value === "function") {
          return "[Function]";
        }
        if (typeof value === "symbol") {
          return "[Symbol]";
        }
        if (typeof value === "bigint") {
          return value.toString() + "n";
        }
        return value;
      })
    );
  }
};

const executeTask = async <TInput, TOutput, TVariant = undefined>(
  task: Evalite.Task<TInput, TOutput, TVariant>,
  input: TInput,
  variant: TVariant
): Promise<TOutput> => {
  const taskResult = await task(input, variant);

  if (
    typeof taskResult === "object" &&
    taskResult &&
    Symbol.asyncIterator in taskResult
  ) {
    console.warn(
      "Streaming support has been removed. Process the stream before returning from task() (e.g., await result.text for AI SDK)"
    );
  }

  return taskResult;
};

const runTask = async <TInput, TOutput, TExpected, TVariant = undefined>(
  opts: {
    input: TInput;
    expected: TExpected | undefined;
    variant: TVariant;
    traces: Evalite.Trace[];
  } & Omit<Evalite.RunnerOpts<TInput, TOutput, TExpected, TVariant>, "data">
) => {
  const start = performance.now();
  const output = await executeTask(opts.task, opts.input, opts.variant);
  const duration = Math.round(performance.now() - start);

  const scores = await Promise.all(
    (opts.scorers || []).map(async (scorerOrOpts) => {
      if (typeof scorerOrOpts === "function") {
        return scorerOrOpts({
          input: opts.input,
          output,
          expected: opts.expected as TExpected,
        });
      } else {
        return createScorer(scorerOrOpts)({
          input: opts.input,
          output,
          expected: opts.expected as TExpected,
        });
      }
    })
  );

  const columns =
    (await opts.columns?.({
      input: opts.input,
      output,
      expected: opts.expected,
      scores,
      traces: opts.traces,
    })) || [];

  return {
    output,
    scores,
    duration,
    columns,
  };
};

export const evalite = <TInput, TOutput, TExpected = undefined>(
  evalName: string,
  opts: Evalite.RunnerOpts<TInput, TOutput, TExpected>
) => registerEvalite(evalName, opts);

evalite.skip = <TInput, TOutput, TExpected = undefined>(
  evalName: string,
  opts: Evalite.RunnerOpts<TInput, TOutput, TExpected>
) => registerEvalite(evalName, opts, { modifier: "skip" });

evalite.each = <TVariant>(
  variants: Array<{ name: string; input: TVariant; only?: boolean }>
) => {
  function createEvals<TInput, TOutput, TExpected = undefined>(
    evalName: string,
    opts: Evalite.RunnerOpts<TInput, TOutput, TExpected, TVariant>,
    modifier?: "skip"
  ) {
    const hasOnlyFlag = variants.some((v) => v.only === true);
    const filteredVariants = hasOnlyFlag
      ? variants.filter((v) => v.only === true)
      : variants;

    for (const variant of filteredVariants) {
      registerEvalite(
        evalName,
        {
          ...opts,
          task: (input) => opts.task(input, variant.input),
        },
        { variantName: variant.name, variantGroup: evalName, modifier }
      );
    }
  }

  function eachFn<TInput, TOutput, TExpected = undefined>(
    evalName: string,
    opts: Evalite.RunnerOpts<TInput, TOutput, TExpected, TVariant>
  ) {
    return createEvals(evalName, opts);
  }

  eachFn.skip = <TInput, TOutput, TExpected = undefined>(
    evalName: string,
    opts: Evalite.RunnerOpts<TInput, TOutput, TExpected, TVariant>
  ) => {
    return createEvals(evalName, opts, "skip");
  };

  return eachFn;
};

type Result<TSuccess, TFailure> =
  | {
      success: true;
      data: TSuccess;
    }
  | {
      success: false;
      error: TFailure;
    };

const resolveData = async <Output>(
  datasetFunction: Evalite.AsyncResolver<Output>
): Promise<Result<Output, Error>> => {
  try {
    return {
      success: true,
      data: await datasetFunction(),
    };
  } catch (e) {
    return {
      success: false,
      error: e as Error,
    };
  }
};

function registerEvalite<TInput, TOutput, TExpected>(
  evalName: string,
  opts: Evalite.RunnerOpts<TInput, TOutput, TExpected>,
  vitestOpts: {
    modifier?: "only" | "skip";
    variantName?: string;
    variantGroup?: string;
  } = {}
) {
  const describeFn = vitestOpts.modifier === "skip" ? describe.skip : describe;
  const datasetPromise: Promise<Result<any, Error>> =
    vitestOpts.modifier === "skip"
      ? Promise.resolve({ success: true, data: [] })
      : typeof opts.data === "function"
        ? resolveData(opts.data)
        : Promise.resolve({ success: true, data: opts.data });

  const fullEvalName = vitestOpts.variantName
    ? `${evalName} [${vitestOpts.variantName}]`
    : evalName;

  return describeFn(fullEvalName, async () => {
    const datasetResult = await datasetPromise;

    if (!datasetResult.success) {
      it(fullEvalName, async ({ annotate, task }) => {
        await annotate(
          serializeAnnotation({
            type: "EVAL_SUBMITTED",
            eval: {
              suiteName: fullEvalName,
              filepath: task.file.filepath,
              order: 0,
              status: "fail",
              variantName: vitestOpts.variantName,
              variantGroup: vitestOpts.variantGroup,
              trialIndex: undefined,
              duration: 0,
              expected: null,
              input: null,
              output: datasetResult.error,
              scores: [],
              traces: [],
              renderedColumns: [],
            },
          })
        );

        throw datasetResult.error;
      });
      return;
    }

    const dataset: Evalite.DataShape<TInput, TExpected>[] = datasetResult.data;

    // Filter dataset if any entry has `only: true`
    const hasOnlyFlag = dataset.some((d) => d.only === true);
    const filteredDataset = hasOnlyFlag
      ? dataset.filter((d) => d.only === true)
      : dataset;

    // Get trialCount from opts or config (opts wins)
    const configTrialCount = inject("trialCount");
    const trialCount = opts.trialCount ?? configTrialCount ?? 1;

    // Expand dataset with trials
    const expandedDataset: Array<{
      input: TInput;
      expected: TExpected | undefined;
      dataIndex: number;
      trialIndex?: number;
      index: number;
    }> = [];

    for (let dataIndex = 0; dataIndex < filteredDataset.length; dataIndex++) {
      const dataPoint = filteredDataset[dataIndex]!;

      for (let trialIndex = 0; trialIndex < trialCount; trialIndex++) {
        expandedDataset.push({
          input: dataPoint.input,
          expected: dataPoint.expected,
          dataIndex,
          trialIndex: trialCount > 1 ? trialIndex : undefined,
          index: expandedDataset.length,
        });
      }
    }

    // Create individual tests manually to avoid serialization
    // This allows non-serializable data (like Zod schemas) in closures
    for (const data of expandedDataset) {
      it.concurrent(fullEvalName, async ({ task, annotate }) => {
        if (!annotate || typeof annotate !== "function") {
          throw new Error(
            "Evalite requires Vitest 3.2.4 or later for the annotations API. Please upgrade: `npm install vitest@latest`"
          );
        }

        const cwd = inject("cwd");

        const rootDir = path.join(cwd, FILES_LOCATION);

        // Send EVAL_STARTED annotation immediately
        await annotate(
          serializeAnnotation({
            type: "EVAL_STARTED",
            initialEval: {
              suiteName: fullEvalName,
              filepath: task.file.filepath,
              order: data.index,
              variantName: vitestOpts.variantName,
              variantGroup: vitestOpts.variantGroup,
              status: "running",
              trialIndex: data.trialIndex,
            },
          })
        );

        const start = performance.now();

        const filePromises: Promise<void>[] = [];

        writeFileQueueLocalStorage.enterWith(async (filePath, buffer) => {
          const func = async () => {
            await mkdir(path.dirname(filePath), { recursive: true });
            await writeFile(filePath, buffer);
          };

          const promise = func();

          filePromises.push(promise);
        });

        const traces: Evalite.Trace[] = [];
        reportTraceLocalStorage.enterWith((trace) => traces.push(trace));

        const cacheHits: Array<{
          keyHash: string;
          hit: boolean;
          savedDuration: number;
        }> = [];
        reportCacheHitLocalStorage.enterWith((hit) => cacheHits.push(hit));

        cacheContextLocalStorage.enterWith({
          trialCount: inject("trialCount"),
          evalName: evalName,
          serverPort: inject("serverPort"),
        });

        const [inputForMeta, expectedForMeta] = await Promise.all([
          createEvaliteFileIfNeeded({ rootDir, input: data.input }),
          createEvaliteFileIfNeeded({ rootDir, input: data.expected }),
        ]);

        // Ensure data is serializable
        const serializableInput = makeSerializable(inputForMeta);
        const serializableExpected = makeSerializable(expectedForMeta);

        try {
          // Pass raw data (from closure) to scorers - allows non-serializable data
          const { output, scores, duration, columns } = await runTask({
            expected: data.expected,
            input: data.input,
            variant: undefined,
            scorers: opts.scorers,
            task: opts.task,
            columns: opts.columns,
            traces,
          });

          const [outputWithFiles, tracesWithFiles, renderedColumns] =
            await Promise.all([
              createEvaliteFileIfNeeded({
                rootDir,
                input: output,
              }),
              handleFilesInTraces(rootDir, traces),
              handleFilesInColumns(rootDir, columns),
            ]);

          const serializableOutput = makeSerializable(outputWithFiles);

          // Send EVAL_SUBMITTED annotation
          await annotate(
            serializeAnnotation({
              type: "EVAL_SUBMITTED",
              eval: {
                suiteName: fullEvalName,
                filepath: task.file.filepath,
                order: data.index,
                duration: Math.round(performance.now() - start),
                expected: serializableExpected,
                input: serializableInput,
                output: serializableOutput,
                scores,
                traces: tracesWithFiles,
                status: "success",
                renderedColumns,
                variantName: vitestOpts.variantName,
                variantGroup: vitestOpts.variantGroup,
                trialIndex: data.trialIndex,
              },
            })
          );
        } catch (e) {
          const duration = Math.round(performance.now() - start);

          // Serialize error for better display in UI
          const serializedError =
            e instanceof Error
              ? {
                  name: e.name,
                  message: e.message,
                  stack: e.stack,
                }
              : e;

          // Send EVAL_SUBMITTED annotation for failure
          await annotate(
            serializeAnnotation({
              type: "EVAL_SUBMITTED",
              eval: {
                suiteName: fullEvalName,
                filepath: task.file.filepath,
                order: data.index,
                duration,
                expected: serializableExpected,
                input: serializableInput,
                output: serializedError,
                scores: [],
                traces: await handleFilesInTraces(rootDir, traces),
                status: "fail",
                renderedColumns: [],
                variantName: vitestOpts.variantName,
                variantGroup: vitestOpts.variantGroup,
                trialIndex: data.trialIndex,
              },
            })
          );
          throw e;
        }

        await Promise.all(filePromises);
      });
    }
  });
}

const handleFilesInColumns = async (
  rootDir: string,
  columns: Evalite.RenderedColumn[]
) => {
  return await Promise.all(
    columns.map(async (column) => {
      const file = await createEvaliteFileIfNeeded({
        rootDir,
        input: column.value,
      });
      return {
        ...column,
        value: file,
      };
    })
  );
};

const handleFilesInTraces = async (
  rootDir: string,
  traces: Evalite.Trace[]
) => {
  return await Promise.all(
    traces.map(async (trace) => {
      const [input, output] = await Promise.all([
        createEvaliteFileIfNeeded({
          rootDir,
          input: trace.input,
        }),
        createEvaliteFileIfNeeded({
          rootDir,
          input: trace.output,
        }),
      ]);
      return {
        ...trace,
        input,
        output,
      };
    })
  );
};

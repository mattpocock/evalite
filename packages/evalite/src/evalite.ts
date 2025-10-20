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

const runTask = async <
  TInput,
  TOutput,
  TExpected,
  TVariant = undefined,
  TMetadata = unknown,
>(
  opts: {
    input: TInput;
    expected: TExpected | undefined;
    variant: TVariant;
    metadata: TMetadata | undefined;
  } & Omit<
    Evalite.RunnerOpts<TInput, TOutput, TExpected, TVariant, TMetadata>,
    "data" | "experimental_customColumns"
  >
) => {
  const start = performance.now();
  const output = await executeTask(opts.task, opts.input, opts.variant);
  const duration = Math.round(performance.now() - start);

  const columns =
    (await opts.columns?.({
      input: opts.input,
      output,
      expected: opts.expected,
      metadata: opts.metadata,
    })) || [];

  const scores = await Promise.all(
    (opts.scorers || []).map(async (scorerOrOpts) => {
      if (typeof scorerOrOpts === "function") {
        return scorerOrOpts({
          input: opts.input,
          output,
          expected: opts.expected,
          metadata: opts.metadata,
        });
      } else {
        return createScorer(scorerOrOpts)({
          input: opts.input,
          output,
          expected: opts.expected,
          metadata: opts.metadata,
        });
      }
    })
  );

  return {
    output,
    scores,
    duration,
    columns,
  };
};

export const evalite = <
  TInput,
  TOutput,
  TExpected = TOutput,
  TMetadata = unknown,
>(
  evalName: string,
  opts: Evalite.RunnerOpts<TInput, TOutput, TExpected, undefined, TMetadata>
) => registerEvalite(evalName, opts);

evalite.skip = <TInput, TOutput, TExpected, TMetadata = unknown>(
  evalName: string,
  opts: Evalite.RunnerOpts<TInput, TOutput, TExpected, undefined, TMetadata>
) => registerEvalite(evalName, opts, { modifier: "skip" });

/**
 * @deprecated Use `evalite.skip` instead.
 */
evalite.experimental_skip = evalite.skip;

evalite.each = <TVariant>(
  variants: Array<{ name: string; input: TVariant }>
) => {
  return <TInput, TOutput, TExpected = TOutput, TMetadata = unknown>(
    evalName: string,
    opts: Evalite.RunnerOpts<TInput, TOutput, TExpected, TVariant, TMetadata>
  ) => {
    for (const variant of variants) {
      registerEvalite(
        evalName,
        {
          ...opts,
          task: (input) => opts.task(input, variant.input),
        },
        { variantName: variant.name, variantGroup: evalName }
      );
    }
  };
};

function registerEvalite<TInput, TOutput, TExpected, TMetadata = unknown>(
  evalName: string,
  opts: Evalite.RunnerOpts<TInput, TOutput, TExpected, undefined, TMetadata>,
  vitestOpts: {
    modifier?: "only" | "skip";
    variantName?: string;
    variantGroup?: string;
  } = {}
) {
  const describeFn = vitestOpts.modifier === "skip" ? describe.skip : describe;
  const datasetPromise =
    vitestOpts.modifier === "skip"
      ? Promise.resolve([])
      : typeof opts.data === "function"
        ? opts.data()
        : Promise.resolve(opts.data);

  const fullEvalName = vitestOpts.variantName
    ? `${evalName} [${vitestOpts.variantName}]`
    : evalName;

  return describeFn(fullEvalName, async () => {
    const dataset = await datasetPromise;

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
      expected?: TExpected;
      metadata?: TMetadata;
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
          metadata: dataPoint.metadata,
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
            metadata: data.metadata,
            variant: undefined,
            scorers: opts.scorers,
            task: opts.task,
            columns: opts.columns || opts.experimental_customColumns,
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

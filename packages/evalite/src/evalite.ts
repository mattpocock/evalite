import { mkdir, writeFile } from "fs/promises";
import * as path from "path";
import { describe, inject, it } from "vitest";
import { reportTraceLocalStorage } from "./traces.js";
import { writeFileQueueLocalStorage } from "./write-file-queue-local-storage.js";
import { createEvaliteFileIfNeeded } from "./utils.js";
import type { Evalite } from "./types.js";
import { FILES_LOCATION } from "./backend-only-constants.js";
import { createScorer } from "./index.js";
import { serializeAnnotation } from "./reporter/events.js";

const joinArrayOfUnknownResults = (results: unknown[]): unknown => {
  return results.reduce((acc, result) => {
    if (
      typeof result === "string" ||
      typeof result === "number" ||
      typeof result === "boolean"
    ) {
      return `${acc}${result}`;
    }
    throw new Error(
      `Cannot display results of stream: stream contains non-string, non-number, non-boolean chunks.`
    );
  }, "");
};

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
  const taskResultOrStream = await task(input, variant);

  if (
    typeof taskResultOrStream === "object" &&
    taskResultOrStream &&
    Symbol.asyncIterator in taskResultOrStream
  ) {
    const chunks: TOutput[] = [];

    for await (const chunk of taskResultOrStream) {
      chunks.push(chunk);
    }

    return joinArrayOfUnknownResults(chunks) as TOutput;
  }

  return taskResultOrStream;
};

const runTask = async <TInput, TOutput, TExpected, TVariant = undefined>(
  opts: {
    input: TInput;
    expected: TExpected | undefined;
    variant: TVariant;
  } & Omit<
    Evalite.RunnerOpts<TInput, TOutput, TExpected, TVariant>,
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
    })) || [];

  const scores = await Promise.all(
    (opts.scorers || []).map(async (scorerOrOpts) => {
      if (typeof scorerOrOpts === "function") {
        return scorerOrOpts({
          input: opts.input,
          output,
          expected: opts.expected,
        });
      } else {
        return createScorer(scorerOrOpts)({
          input: opts.input,
          output,
          expected: opts.expected,
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

export const evalite = <TInput, TOutput, TExpected = TOutput>(
  evalName: string,
  opts: Evalite.RunnerOpts<TInput, TOutput, TExpected>
) => registerEvalite(evalName, opts);

evalite.skip = <TInput, TOutput, TExpected>(
  evalName: string,
  opts: Evalite.RunnerOpts<TInput, TOutput, TExpected>
) => registerEvalite(evalName, opts, { modifier: "skip" });

/**
 * @deprecated Use `evalite.skip` instead.
 */
evalite.experimental_skip = evalite.skip;

evalite.each = <TVariant>(
  variants: Array<{ name: string; input: TVariant }>
) => {
  return <TInput, TOutput, TExpected = TOutput>(
    evalName: string,
    opts: Evalite.RunnerOpts<TInput, TOutput, TExpected, TVariant>
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

    // Create individual tests manually to avoid serialization
    // This allows non-serializable data (like Zod schemas) in closures
    for (let index = 0; index < filteredDataset.length; index++) {
      const data = { ...filteredDataset[index]!, index };

      it.concurrent(fullEvalName, async ({ task, annotate }) => {
        if (!annotate || typeof annotate !== "function") {
          throw new Error(
            "Evalite requires Vitest 3.2.4 or later for the annotations API. Please upgrade: `npm install vitest@latest`"
          );
        }

        const cwd = inject("cwd");

        const rootDir = path.join(cwd, FILES_LOCATION);

        const start = performance.now();

        // Send RESULT_STARTED annotation immediately
        await annotate(
          serializeAnnotation({
            type: "RESULT_STARTED",
            emittedAt: start,
            initialResult: {
              evalName: fullEvalName,
              filepath: task.file.filepath,
              order: data.index,
              variantName: vitestOpts.variantName,
              variantGroup: vitestOpts.variantGroup,
              status: "running",
            },
          })
        );

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

          const submittedAt = performance.now();

          // Send RESULT_SUBMITTED annotation
          await annotate(
            serializeAnnotation({
              type: "RESULT_SUBMITTED",
              emittedAt: submittedAt,
              result: {
                evalName: fullEvalName,
                filepath: task.file.filepath,
                order: data.index,
                duration: Math.round(submittedAt - start),
                expected: serializableExpected,
                input: serializableInput,
                output: serializableOutput,
                scores,
                traces: tracesWithFiles,
                status: "success",
                renderedColumns,
                variantName: vitestOpts.variantName,
                variantGroup: vitestOpts.variantGroup,
              },
            })
          );
        } catch (e) {
          const failedAt = performance.now();
          const duration = Math.round(failedAt - start);

          // Serialize error for better display in UI
          const serializedError =
            e instanceof Error
              ? {
                  name: e.name,
                  message: e.message,
                  stack: e.stack,
                }
              : e;

          // Send RESULT_SUBMITTED annotation for failure
          await annotate(
            serializeAnnotation({
              type: "RESULT_SUBMITTED",
              emittedAt: failedAt,
              result: {
                evalName: fullEvalName,
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

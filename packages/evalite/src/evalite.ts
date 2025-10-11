import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { describe, inject, it } from "vitest";
import { reportTraceLocalStorage } from "./traces.js";
import { writeFileQueueLocalStorage } from "./write-file-queue-local-storage.js";
import { createEvaliteFileIfNeeded } from "./utils.js";
import type { Evalite } from "./types.js";
import { FILES_LOCATION } from "./backend-only-constants.js";
import { createScorer } from "./index.js";

declare module "vitest" {
  interface TaskMeta {
    evalite?: Evalite.TaskMeta;
  }
}

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

evalite.experimental_skip = <TInput, TOutput, TExpected>(
  evalName: string,
  opts: Evalite.RunnerOpts<TInput, TOutput, TExpected>
) => registerEvalite(evalName, opts, { modifier: "skip" });

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
    vitestOpts.modifier === "skip" ? Promise.resolve([]) : opts.data();

  const fullEvalName = vitestOpts.variantName
    ? `${evalName} [${vitestOpts.variantName}]`
    : evalName;

  return describeFn(fullEvalName, async () => {
    const dataset = await datasetPromise;
    it.concurrent.for(dataset.map((d, index) => ({ ...d, index })))(
      fullEvalName,
      async (data, { task }) => {
        const cwd = inject("cwd");

        const rootDir = path.join(cwd, FILES_LOCATION);

        task.meta.evalite = {
          duration: undefined,
        };

        task.meta.evalite.initialResult = {
          evalName: fullEvalName,
          filepath: task.file.filepath,
          order: data.index,
          variantName: vitestOpts.variantName,
          variantGroup: vitestOpts.variantGroup,
          status: "running",
        };

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

        const [input, expected] = await Promise.all([
          createEvaliteFileIfNeeded({ rootDir, input: data.input }),
          createEvaliteFileIfNeeded({ rootDir, input: data.expected }),
        ]);

        task.meta.evalite.resultAfterFilesSaved = {
          evalName: fullEvalName,
          filepath: task.file.filepath,
          order: data.index,
          input,
          expected,
          variantName: vitestOpts.variantName,
          variantGroup: vitestOpts.variantGroup,
          status: "running",
        };

        try {
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

          task.meta.evalite.duration = Math.round(performance.now() - start);
          task.meta.evalite.result = {
            evalName: fullEvalName,
            filepath: task.file.filepath,
            order: data.index,
            duration: Math.round(performance.now() - start),
            expected: expected,
            input: input,
            output: outputWithFiles,
            scores,
            traces: tracesWithFiles,
            status: "success",
            renderedColumns,
            variantName: vitestOpts.variantName,
            variantGroup: vitestOpts.variantGroup,
          };
        } catch (e) {
          task.meta.evalite.duration = Math.round(performance.now() - start);
          task.meta.evalite.result = {
            evalName: fullEvalName,
            filepath: task.file.filepath,
            order: data.index,
            duration: task.meta.evalite.duration,
            expected: expected,
            input: input,
            output: e,
            scores: [],
            traces: await handleFilesInTraces(rootDir, traces),
            status: "fail",
            renderedColumns: [],
            variantName: vitestOpts.variantName,
            variantGroup: vitestOpts.variantGroup,
          };
          throw e;
        }

        await Promise.all(filePromises);
      }
    );
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

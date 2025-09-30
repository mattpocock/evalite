import { createDatabase, getEvalsAsRecord } from "evalite/db";
import { runVitest } from "evalite/runner";
import { assert, expect, it, vitest } from "vitest";
import { captureStdout, loadFixture } from "./test-utils.js";

it("Should report traces from generateText using traceAISDKModel", async () => {
  using fixture = loadFixture("ai-sdk-traces");

  const captured = captureStdout();
  const exit = vitest.fn();
  globalThis.process.exit = exit as any;

  await runVitest({
    cwd: fixture.dir,
    mode: "run-once-and-exit",
    path: undefined,
    scoreThreshold: 50,
    testOutputWritable: captured.writable,
  });

  const db = createDatabase(fixture.dbLocation);

  const evals = await getEvalsAsRecord(db);

  expect(evals["AI SDK Traces"]![0]?.results[0]?.traces).toHaveLength(1);

  const trace = evals["AI SDK Traces"]![0]?.results[0]?.traces[0];
  expect(trace?.output).toMatchObject({
    text: "Hello, world!",
    toolCalls: [
      {
        args: "{}",
        toolCallId: "abc",
        toolName: "myToolCall",
      },
    ],
  });

  expect(exit).toHaveBeenCalledWith(1);
});

it("Should report traces from streamText using traceAISDKModel", async () => {
  using fixture = loadFixture("ai-sdk-traces-stream");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const db = createDatabase(fixture.dbLocation);

  const evals = await getEvalsAsRecord(db);

  const traces = evals["AI SDK Traces"]![0]?.results[0]?.traces;

  assert(traces?.[0], "Expected a trace to be reported");

  expect(traces?.[0].output_tokens).toEqual(10);
  expect(traces?.[0].input_tokens).toEqual(3);
});

import { getEvalsAsRecordViaAdapter } from "./test-utils.js";
import { runVitest } from "evalite/runner";
import { createSqliteAdapter } from "evalite/db";
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

  await using adapter = createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  expect(evals["AI SDK Traces"]![0]?.results[0]?.traces).toHaveLength(1);

  const trace = evals["AI SDK Traces"]![0]?.results[0]?.traces[0];
  expect(trace?.output).toMatchObject({
    text: "Hello, world!",
    toolCalls: [
      {
        input: "{}",
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

  await using adapter = createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  const traces = evals["AI SDK Traces"]![0]?.results[0]?.traces;

  assert(traces?.[0], "Expected a trace to be reported");

  expect(traces?.[0].input_tokens).toEqual(3);
  expect(traces?.[0].output_tokens).toEqual(10);
  expect(traces?.[0].total_tokens).toEqual(14);
});

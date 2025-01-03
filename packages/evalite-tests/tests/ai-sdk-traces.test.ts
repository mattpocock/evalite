import { createDatabase, getEvalsAsRecord } from "@evalite/core/db";
import { runVitest } from "evalite/runner";
import { assert, expect, it } from "vitest";
import { captureStdout, loadFixture } from "./test-utils.js";

it("Should report traces from generateText using traceAISDKModel", async () => {
  using fixture = loadFixture("ai-sdk-traces");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
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
        toolCallType: "function",
        toolName: "myToolCall",
      },
    ],
  });
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

  expect(traces?.[0].completion_tokens).toEqual(10);
  expect(traces?.[0].prompt_tokens).toEqual(3);
});

it("Should handle files in traces", async () => {
  using fixture = loadFixture("ai-sdk-traces-files");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const db = createDatabase(fixture.dbLocation);

  const evals = await getEvalsAsRecord(db);

  console.log(captured.getOutput());

  const traces = evals["AI SDK Traces"]![0]?.results[0]?.traces;

  assert(traces?.[0], "Expected a trace to be reported");

  expect(traces?.[0].input).toHaveLength(1);
});

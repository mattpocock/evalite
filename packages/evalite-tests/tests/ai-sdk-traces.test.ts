import { assert, expect, it } from "vitest";
import { getEvalsAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should report traces from generateText using traceAISDKModel", async () => {
  using fixture = await loadFixture("ai-sdk-traces");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

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
});

it("Should report traces from streamText using traceAISDKModel", async () => {
  using fixture = await loadFixture("ai-sdk-traces-stream");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  const traces = evals["AI SDK Traces"]![0]?.results[0]?.traces;

  assert(traces?.[0], "Expected a trace to be reported");

  expect(traces?.[0].input_tokens).toEqual(3);
  expect(traces?.[0].output_tokens).toEqual(10);
  expect(traces?.[0].total_tokens).toEqual(14);
});

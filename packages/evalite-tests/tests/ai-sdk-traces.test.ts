import { assert, expect, it } from "vitest";
import { getEvalsAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should report traces from generateText using traceAISDKModel", async () => {
  await using fixture = await loadFixture("ai-sdk-traces");

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
  await using fixture = await loadFixture("ai-sdk-traces-stream");

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

it("Should redact reasoning prompt parts from traces", async () => {
  await using fixture = await loadFixture("ai-sdk-traces-reasoning");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  const traces = evals["AI SDK Traces Reasoning"]![0]?.results[0]?.traces;

  assert(traces?.[0], "Expected a trace to be reported");
  expect(traces).toHaveLength(1);

  const traceInput = traces[0].input;
  expect(JSON.stringify(traceInput)).not.toContain("reasoning");
  expect(JSON.stringify(traceInput)).not.toContain("private reasoning");
  expect(JSON.stringify(traceInput)).not.toContain("whole message");

  expect(traceInput).toMatchObject([
    {
      role: "user",
      content: [{ type: "text", text: "What is 2 + 2?" }],
    },
    {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "I should use the calculator.",
        },
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "calculator",
          input: { expression: "2 + 2" },
        },
      ],
    },
    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "call-1",
          toolName: "calculator",
          output: { type: "text", value: "4" },
        },
      ],
    },
  ]);
});

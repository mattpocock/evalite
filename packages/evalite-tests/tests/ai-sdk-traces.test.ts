import { expect, it } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should report traces from generateText using traceAISDKModel", async () => {
  await using fixture = await loadFixture("ai-sdk-traces");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const suites = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(suites["AI SDK Traces"]![0]?.evals[0]?.traces).toHaveLength(1);

  const trace = suites["AI SDK Traces"]![0]?.evals[0]?.traces[0];
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

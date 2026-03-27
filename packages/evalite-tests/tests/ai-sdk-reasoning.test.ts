import { expect, it } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should handle reasoning content in prompt without throwing", async () => {
  await using fixture = await loadFixture("ai-sdk-reasoning");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const suites = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(suites["AI SDK Reasoning"]![0]?.evals[0]?.traces).toHaveLength(1);

  const trace = suites["AI SDK Reasoning"]![0]?.evals[0]?.traces[0];

  // Verify the trace input contains the assistant message with reasoning filtered out
  const assistantMessage = (trace?.input as any[])?.find(
    (m: any) => m.role === "assistant"
  );
  expect(assistantMessage).toBeDefined();
  // Reasoning content should be filtered out, only text should remain
  expect(assistantMessage.content).toEqual([
    { type: "text", text: "Previous response" },
  ]);

  expect(trace?.output).toMatchObject({
    text: "Response after reasoning",
  });
});

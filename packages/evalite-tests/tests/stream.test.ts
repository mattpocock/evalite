import { expect, it } from "vitest";
import { loadFixture } from "./test-utils";
import { getEvalsAsRecordViaStorage } from "./test-utils.js";

it("Should be able to handle a stream", async () => {
  await using fixture = await loadFixture("stream");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  expect(evals.Stream?.[0]?.results[0]?.output).toBe("abcdef");
});

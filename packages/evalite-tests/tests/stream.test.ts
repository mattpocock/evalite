import { expect, it } from "vitest";
import { loadFixture } from "./test-utils";
import { getSuitesAsRecordViaStorage } from "./test-utils.js";

it("Should be able to handle a stream", async () => {
  await using fixture = await loadFixture("stream");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals.Stream?.[0]?.evals[0]?.output).toBe("abcdef");
});

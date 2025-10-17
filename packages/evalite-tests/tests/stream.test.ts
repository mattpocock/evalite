import { runVitest } from "evalite/runner";
import { expect, it } from "vitest";
import { loadFixture, captureStdout } from "./test-utils";
import { getEvalsAsRecordViaAdapter } from "./test-utils.js";

it("Should be able to handle a stream", async () => {
  using fixture = loadFixture("stream");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.dbLocation);

  expect(evals.Stream?.[0]?.results[0]?.output).toBe("abcdef");
});

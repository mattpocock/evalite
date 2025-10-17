import { runEvalite } from "evalite/runner";
import { createSqliteAdapter } from "evalite/sqlite-adapter";
import { expect, it } from "vitest";
import { loadFixture, captureStdout } from "./test-utils";
import { getEvalsAsRecordViaAdapter } from "./test-utils.js";

it("Should be able to handle a stream", async () => {
  using fixture = loadFixture("stream");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  await using adapter = await createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  expect(evals.Stream?.[0]?.results[0]?.output).toBe("abcdef");
});

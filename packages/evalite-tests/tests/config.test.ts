import { runVitest } from "evalite/runner";
import { createSqliteAdapter } from "evalite/db";
import { assert, expect, it } from "vitest";
import {
  captureStdout,
  loadFixture,
  getEvalsAsRecordViaAdapter,
} from "./test-utils.js";

it("Should ignore includes in a vite.config.ts", async () => {
  using fixture = loadFixture("config-includes");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    mode: "run-once-and-exit",
    testOutputWritable: captured.writable,
  });

  await using adapter = createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  expect(evals.Basics).toHaveLength(1);
});

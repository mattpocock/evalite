import { runVitest } from "evalite/runner";
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

  const evals = await getEvalsAsRecordViaAdapter(fixture.dbLocation);

  expect(evals.Basics).toHaveLength(1);
});

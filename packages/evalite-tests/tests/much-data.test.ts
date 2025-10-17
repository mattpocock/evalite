import { runEvalite } from "evalite/runner";
import { createSqliteAdapter } from "evalite/sqlite-adapter";
import { expect, it } from "vitest";
import {
  captureStdout,
  loadFixture,
  getEvalsAsRecordViaAdapter,
} from "./test-utils.js";

it("Should report long datasets consistently in the same order", async () => {
  using fixture = loadFixture("much-data");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  await using adapter = await createSqliteAdapter(fixture.dbLocation);
  const jsonDbEvals = await getEvalsAsRecordViaAdapter(adapter);

  expect(jsonDbEvals["Much Data"]![0]!.results).toMatchObject([
    {
      input: "first",
    },
    {
      input: "second",
    },
    {
      input: "third",
    },
    {
      input: "fourth",
    },
  ]);
});

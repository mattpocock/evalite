import { runVitest } from "evalite/runner";
import { assert, expect, it } from "vitest";
import {
  captureStdout,
  getEvalsAsRecordViaAdapter,
  loadFixture,
} from "./test-utils.js";
import { createSqliteAdapter } from "evalite/sqlite-adapter";

it("Should handle objects as inputs and outputs", async () => {
  using fixture = loadFixture("objects");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  await using adapter = createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  expect(evals).toMatchObject({
    Basics: [
      {
        results: [
          {
            input: [
              {
                input: "abc",
              },
            ],
            output: [
              {
                input: "abc",
              },
              { input: "abc", output: 123 },
            ],
            expected: [
              {
                input: "abc",
                output: 123,
              },
            ],
          },
        ],
      },
    ],
  });
});

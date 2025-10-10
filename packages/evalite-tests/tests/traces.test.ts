import { expect, it } from "vitest";
import { runVitest } from "evalite/runner";
import { captureStdout, loadFixture } from "./test-utils.js";
import { createDatabase, getEvalsAsRecord } from "evalite/db";

it("Should report traces from reportTrace", async () => {
  using fixture = loadFixture("traces");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const db = createDatabase(fixture.dbLocation);

  const evals = await getEvalsAsRecord(db);

  expect(evals.Traces![0]).toMatchObject({
    results: [
      {
        traces: [
          {
            end_time: 100,
            output: "abcdef",
            input: [
              {
                content: "abc",
                role: "input",
              },
            ],
            start_time: 0,
            output_tokens: 1,
            input_tokens: 1,
            total_tokens: 2,
          },
        ],
      },
    ],
  });
});

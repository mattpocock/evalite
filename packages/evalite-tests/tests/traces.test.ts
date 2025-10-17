import { expect, it } from "vitest";
import { createSqliteAdapter } from "evalite/sqlite-adapter";
import { runEvalite } from "evalite/runner";
import { captureStdout, loadFixture } from "./test-utils.js";
import { getEvalsAsRecordViaAdapter } from "./test-utils.js";

it("Should report traces from reportTrace", async () => {
  using fixture = loadFixture("traces");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  await using adapter = await createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

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

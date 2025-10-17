import { expect, it } from "vitest";
import { runVitest } from "evalite/runner";
import { captureStdout, loadFixture } from "./test-utils.js";
import { getEvalsAsRecordViaAdapter } from "./test-utils.js";

it("Should report traces from reportTrace", async () => {
  using fixture = loadFixture("traces");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.dbLocation);

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

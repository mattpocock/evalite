import { expect, it } from "vitest";
import { runVitest } from "evalite/runner";
import { captureStdout, loadFixture } from "./test-utils.js";
import { getEvalsAsRecordViaAdapter } from "./test-utils.js";

it("Should work with data as an array (polymorphic)", async () => {
  using fixture = loadFixture("polymorphic-data");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  expect(captured.getOutput()).toContain("Duration");
  expect(captured.getOutput()).toContain("Score  100%");
});

it("Should save results correctly with polymorphic data", async () => {
  using fixture = loadFixture("polymorphic-data");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.dbLocation);

  expect(evals).toMatchObject({
    "Direct Array Data": [
      {
        name: "Direct Array Data",
        results: [
          {
            scores: [
              {
                name: "Levenshtein",
                score: 1,
              },
            ],
          },
        ],
      },
    ],
    "Function Data": [
      {
        name: "Function Data",
        results: [
          {
            scores: [
              {
                name: "Levenshtein",
                score: 1,
              },
            ],
          },
        ],
      },
    ],
  });
});

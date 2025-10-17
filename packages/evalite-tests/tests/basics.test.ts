import { assert, expect, it } from "vitest";
import { runEvalite } from "evalite/runner";
import { createSqliteAdapter } from "evalite/db";
import {
  captureStdout,
  loadFixture,
  getEvalsAsRecordViaAdapter,
} from "./test-utils.js";

it("Should report the basics correctly", async () => {
  using fixture = loadFixture("basics");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  expect(captured.getOutput()).toContain("Duration");
  expect(captured.getOutput()).toContain("Score  100%");
  expect(captured.getOutput()).toContain("Eval Files  1");
  expect(captured.getOutput()).toContain("Evals  1");
  expect(captured.getOutput()).toContain("100% basics.eval.ts  (1 eval)");
});

it("Should save the basic information in a db", async () => {
  using fixture = loadFixture("basics");

  const captured = captureStdout();

  await runEvalite({
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
        name: "Basics",
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

// https://github.com/mattpocock/evalite/issues/223
it.skip("Should capture the duration as being more than 0", async () => {
  using fixture = loadFixture("basics");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  await using adapter = createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  assert(typeof evals.Basics?.[0]?.duration === "number", "Duration exists");
  expect(evals.Basics?.[0]?.duration).toBeGreaterThan(0);
});

it("Should display a table when there is only one eval", async () => {
  using fixture = loadFixture("basics");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  expect(captured.getOutput()).toContain("Input");
  expect(captured.getOutput()).toContain("Output");
  expect(captured.getOutput()).toContain("Score");
  expect(captured.getOutput()).toContain("abc");
  expect(captured.getOutput()).toContain("abcdef");
});

it("Should capture the filepath of the eval", async () => {
  using fixture = loadFixture("basics");

  const captured = captureStdout();

  await runEvalite({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  await using adapter = createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  expect(evals.Basics?.[0]?.filepath).toContain("basics.eval.ts");
});

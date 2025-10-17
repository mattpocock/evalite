import { runVitest } from "evalite/runner";
import { expect, it } from "vitest";
import {
  captureStdout,
  loadFixture,
  getEvalsAsRecordViaAdapter,
} from "./test-utils.js";

it("Should allow you to render columns based on the input and output", async () => {
  using fixture = loadFixture("columns");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.dbLocation);

  expect(evals.Columns![0]).toMatchObject({
    results: [
      {
        rendered_columns: [
          { label: "Input First", value: "abc" },
          { label: "Expected Last", value: 123 },
          { label: "Output Last", value: 123 },
        ],
      },
    ],
  });
});

it("Should show in the terminal UI", async () => {
  using fixture = loadFixture("columns");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const output = captured.getOutput();

  expect(output).toContain("Input First");
  expect(output).toContain("Expected Last");
  expect(output).toContain("Output Last");
});

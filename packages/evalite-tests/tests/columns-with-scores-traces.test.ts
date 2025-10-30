import { expect, it } from "vitest";
import { getEvalsAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should pass scores and traces to column fields", async () => {
  await using fixture = await loadFixture("columns-with-scores-traces");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  expect(evals["Columns with Scores and Traces"]![0]).toMatchObject({
    results: [
      {
        rendered_columns: [
          { label: "Input", value: "hello" },
          { label: "Output", value: "HELLO" },
          { label: "Expected", value: "HELLO" },
          { label: "Exact Match Score", value: 1 },
          { label: "Exact Match Metadata", value: '{"matched":true}' },
          { label: "Length Score", value: 0.5 },
          { label: "Length Metadata", value: '{"length":5}' },
          { label: "Trace Count", value: 2 },
          { label: "First Trace Input Tokens", value: 10 },
          { label: "Total Tokens", value: 50 },
        ],
      },
    ],
  });
});

it("Should show score and trace data in the terminal UI", async () => {
  await using fixture = await loadFixture("columns-with-scores-traces");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const output = fixture.getOutput();

  expect(output).toContain("Exact Match Score");
  expect(output).toContain("Exact Match Metadata");
  expect(output).toContain("Length Score");
  expect(output).toContain("Length Metadata");
  expect(output).toContain("Trace Count");
  expect(output).toContain("First Trace Input Tokens");
  expect(output).toContain("Total Tokens");
});

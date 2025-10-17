import { expect, it } from "vitest";
import { getEvalsAsRecordViaAdapter, loadFixture } from "./test-utils.js";

it("Should allow you to render columns based on the input and output", async () => {
  await using fixture = await loadFixture("columns");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.adapter);

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
  await using fixture = await loadFixture("columns");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const output = fixture.getOutput();

  expect(output).toContain("Input First");
  expect(output).toContain("Expected Last");
  expect(output).toContain("Output Last");
});

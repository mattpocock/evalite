import { expect, it } from "vitest";
import { loadFixture } from "./test-utils.js";
import { getEvalsAsRecordViaAdapter } from "./test-utils.js";

it("Should report traces from reportTrace", async () => {
  await using fixture = await loadFixture("traces");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.adapter);

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

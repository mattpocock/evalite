import { expect, it } from "vitest";
import { loadFixture } from "./test-utils.js";
import { getSuitesAsRecordViaStorage } from "./test-utils.js";

it("Should report traces from reportTrace", async () => {
  await using fixture = await loadFixture("traces");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const suites = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(suites.Traces![0]).toMatchObject({
    evals: [
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

import { expect, it } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should handle objects as inputs and outputs", async () => {
  await using fixture = await loadFixture("objects");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals).toMatchObject({
    Basics: [
      {
        evals: [
          {
            input: [
              {
                input: "abc",
              },
            ],
            output: [
              {
                input: "abc",
              },
              { input: "abc", output: 123 },
            ],
            expected: [
              {
                input: "abc",
                output: 123,
              },
            ],
          },
        ],
      },
    ],
  });
});

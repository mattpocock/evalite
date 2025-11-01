import { expect, it } from "vitest";
import { loadFixture } from "./test-utils.js";
import { getSuitesAsRecordViaStorage } from "./test-utils.js";

it("Should work with data as an array (polymorphic)", async () => {
  await using fixture = await loadFixture("polymorphic-data");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  expect(fixture.getOutput()).toContain("Duration");
  expect(fixture.getOutput()).toContain("Score  100%");
});

it("Should save results correctly with polymorphic data", async () => {
  await using fixture = await loadFixture("polymorphic-data");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals).toMatchObject({
    "Direct Array Data": [
      {
        name: "Direct Array Data",
        evals: [
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
        evals: [
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

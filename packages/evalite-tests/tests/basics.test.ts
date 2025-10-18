import { assert, expect, it } from "vitest";
import { getEvalsAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should report the basics correctly", async () => {
  await using fixture = await loadFixture("basics");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  expect(fixture.getOutput()).toContain("Duration");
  expect(fixture.getOutput()).toContain("Score  100%");
  expect(fixture.getOutput()).toContain("Eval Files  1");
  expect(fixture.getOutput()).toContain("Evals  1");
  expect(fixture.getOutput()).toContain("100% basics.eval.ts  (1 eval)");
});

it("Should save the basic information in a db", async () => {
  await using fixture = await loadFixture("basics");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

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
  await using fixture = await loadFixture("basics");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  assert(typeof evals.Basics?.[0]?.duration === "number", "Duration exists");
  expect(evals.Basics?.[0]?.duration).toBeGreaterThan(0);
});

it("Should display a table when there is only one eval", async () => {
  await using fixture = await loadFixture("basics");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  expect(fixture.getOutput()).toContain("Input");
  expect(fixture.getOutput()).toContain("Output");
  expect(fixture.getOutput()).toContain("Score");
  expect(fixture.getOutput()).toContain("abc");
  expect(fixture.getOutput()).toContain("abcdef");
});

it("Should capture the filepath of the eval", async () => {
  await using fixture = await loadFixture("basics");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaStorage(fixture.storage);

  expect(evals.Basics?.[0]?.filepath).toContain("basics.eval.ts");
});

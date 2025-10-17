import { expect, it } from "vitest";
import { getEvalsAsRecordViaAdapter, loadFixture } from "./test-utils.js";

it("Should report long datasets consistently in the same order", async () => {
  await using fixture = await loadFixture("much-data");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.adapter);

  expect(evals["Much Data"]![0]!.results).toMatchObject([
    {
      input: "first",
    },
    {
      input: "second",
    },
    {
      input: "third",
    },
    {
      input: "fourth",
    },
  ]);
});

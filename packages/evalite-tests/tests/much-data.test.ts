import { expect, it } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should report long datasets consistently in the same order", async () => {
  await using fixture = await loadFixture("much-data");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals["Much Data"]![0]!.evals).toMatchObject([
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

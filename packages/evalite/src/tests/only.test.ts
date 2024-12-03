import { getJsonDbEvals } from "@evalite/core";
import { assert, expect, it } from "vitest";
import { runVitest } from "../command.js";
import { captureStdout, loadFixture } from "./test-utils.js";

it.only("Should only run the targeted eval", async () => {
  using fixture = loadFixture("only");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
  });

  console.log(captured.getOutput());

  const evals = await getJsonDbEvals({
    dbLocation: fixture.jsonDbLocation,
  });

  expect(evals["Only"]).toBeDefined();
  expect(evals["Not Run"]).toBeUndefined();
  expect(evals["Also Not Run"]).toBeUndefined();
});

import { expect, it } from "vitest";
import { runVitest } from "evalite/runner";
import { captureStdout, loadFixture } from "./test-utils.js";
import { createScorer } from "evalite";
import { createDatabase, getEvalsAsRecord } from "evalite/db";

it("Should let users score based on per task duration", async () => {
  using fixture = loadFixture("duration-scorer");
  const captured = captureStdout();
  
  await runVitest({
      cwd: fixture.dir,
      path: undefined,
      testOutputWritable: captured.writable,
      mode: "run-once-and-exit",
    });

  const db = createDatabase(fixture.dbLocation);

  const evals = await getEvalsAsRecord(db);
  
  expect(evals["Duration Scorer"]![0]?.results[0]?.scores[0]?.name).toBe("Duration Scorer");
  expect(evals["Duration Scorer"]![0]?.results[0]?.duration).toBeGreaterThanOrEqual(9);
  expect(evals["Duration Scorer"]![0]?.results[0]?.scores[0]?.score).toBe(1);

  });
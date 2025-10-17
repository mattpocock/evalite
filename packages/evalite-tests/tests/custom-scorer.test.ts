import { expect, it } from "vitest";
import { runVitest } from "evalite/runner";
import { captureStdout, loadFixture } from "./test-utils.js";
import { createScorer } from "evalite";
import { getEvalsAsRecordViaAdapter } from "./test-utils.js";

it("Should let users create custom scorers", async () => {
  using fixture = loadFixture("custom-scorer");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,

    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const evals = await getEvalsAsRecordViaAdapter(fixture.dbLocation);

  expect(evals.Index![0]?.results[0]?.scores[0]?.name).toBe("Is Same");
  expect(evals.Index![0]?.results[0]?.scores[0]?.score).toBe(1);
});

it("Should fail if the custom scorer does not return a number", async () => {
  const scorer = createScorer<string, string, never>({
    name: "Is Same",
    // @ts-expect-error
    scorer: async (input) => {
      return input === ("awdawd" as any);
    },
  });

  await expect(() =>
    // @ts-expect-error
    scorer({
      output: "awdawd",
    })
  ).rejects.toThrowError("The scorer 'Is Same' must return a number.");
});

it("Should fail if the custom scorer does not return an object containing score as a number", async () => {
  const scorer = createScorer<string, string, never>({
    name: "Is Same",
    // @ts-expect-error
    scorer: async (input) => {
      return {
        // @ts-expect-error
        score: input === "awdawd",
      };
    },
  });

  await expect(() =>
    scorer({
      input: "awdawd",
      output: "awdwd" as any,
    })
  ).rejects.toThrowError("The scorer 'Is Same' must return a number.");
});

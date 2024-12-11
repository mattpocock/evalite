import { assert, describe, expect, it } from "vitest";
import {
  createDatabase,
  getEvals,
  getEvalsAverageScores,
  getMostRecentRun,
  saveRun,
} from "../../db.js";

describe("getEvalsAverageScores", () => {
  it("Should calculate the average score for evals", async () => {
    const db = createDatabase(":memory:");

    saveRun(db, {
      runType: "full",
      files: [
        {
          filepath: "/path/to/file",
          name: "file",
          tasks: [
            {
              name: "task",
              tasks: [
                {
                  name: "task 1",
                  meta: {
                    evalite: {
                      duration: 100,
                      result: {
                        evalName: "task 1",
                        filepath: "/path/to/file",
                        order: 1,
                        input: "input",
                        duration: 100,
                        output: "result",
                        expected: "expected",
                        scores: [
                          {
                            name: "score",
                            score: 1,
                          },
                          {
                            name: "Other Score",
                            score: 0,
                          },
                        ],
                        traces: [],
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const run = getMostRecentRun(db, "full");

    assert(run);

    const evals = getEvals(db, [run.id]);

    const averageScore = getEvalsAverageScores(
      db,
      evals.map((e) => e.id)
    );

    expect(averageScore).toEqual([
      {
        eval_id: evals[0]!.id,
        average: 0.5,
      },
    ]);
  });
});

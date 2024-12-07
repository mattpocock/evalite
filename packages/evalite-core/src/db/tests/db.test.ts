import { expect, it } from "vitest";
import { createDatabase, getMostRecentRun, saveRun } from "../create-db.js";

it("Should let you save an eval", async () => {
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
            meta: {
              evalite: {
                duration: 100,
                sourceCodeHash: "abc",
                results: [
                  {
                    input: "input",
                    duration: 100,
                    output: "result",
                    expected: "expected",
                    scores: [
                      {
                        name: "score",
                        score: 100,
                      },
                    ],
                    traces: [
                      {
                        duration: 100,
                        end: 100,
                        input: "input",
                        output: "output",
                        start: 0,
                        usage: {
                          completionTokens: 100,
                          promptTokens: 100,
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  });

  const run = getMostRecentRun(db, "full");

  expect(run).toMatchObject({
    run: {
      runType: "full",
    },
    evals: [
      {
        duration: 100,
        filepath: "/path/to/file",
      },
    ],
    results: [
      {
        duration: 100,
        input: "input",
        output: "result",
        expected: "expected",
      },
    ],
    traces: [
      {
        end_time: 100,
        input: "input",
        output: "output",
        start_time: 0,
        prompt_tokens: 100,
        completion_tokens: 100,
      },
    ],
    scores: [
      {
        name: "score",
        score: 100,
      },
    ],
  });
});

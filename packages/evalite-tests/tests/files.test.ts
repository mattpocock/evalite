import { getEvalsAsRecordViaAdapter } from "./test-utils.js";
import { createSqliteAdapter } from "evalite/db";
import { EvaliteFile } from "evalite";
import { runVitest } from "evalite/runner";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { captureStdout, loadFixture } from "./test-utils.js";
import { FILES_LOCATION } from "evalite/backend-only-constants";

it("Should save files returned from task() in node_modules", async () => {
  using fixture = loadFixture("files");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const dir = path.join(fixture.dir, FILES_LOCATION);

  const files = await readdir(dir);

  expect(files).toHaveLength(1);

  const filePath = path.join(dir, files[0]!);

  const file = await readFile(filePath);

  expect(file).toBeTruthy();

  await using adapter = createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  expect(evals).toMatchObject({
    Files: [
      {
        results: [
          {
            output: EvaliteFile.fromPath(filePath),
          },
        ],
      },
    ],
  });
});

it("Should save files reported in traces", async () => {
  using fixture = loadFixture("files");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const dir = path.join(fixture.dir, FILES_LOCATION);

  const files = await readdir(dir);

  expect(files).toHaveLength(1);

  const filePath = path.join(dir, files[0]!);

  await using adapter = createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  expect(evals).toMatchObject({
    FilesWithTraces: [
      {
        results: [
          {
            traces: [
              {
                output: EvaliteFile.fromPath(filePath),
              },
            ],
          },
        ],
      },
    ],
  });
});

it("Should show the url in the CLI table", async () => {
  using fixture = loadFixture("files");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    mode: "run-once-and-exit",
    testOutputWritable: captured.writable,
    path: "files-1.eval.ts",
  });

  expect(captured.getOutput()).toContain(`.png`);
  expect(captured.getOutput()).not.toContain(`__EvaliteFile`);
});

it("Should let users add files to data().input and data().expected", async () => {
  using fixture = loadFixture("files");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const dir = path.join(fixture.dir, FILES_LOCATION);

  const files = await readdir(dir);

  expect(files).toHaveLength(1);

  const filePath = path.join(dir, files[0]!);

  const file = await readFile(filePath);

  expect(file).toBeTruthy();

  await using adapter = createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  expect(evals.FilesInInput![0]).toMatchObject({
    results: [
      {
        input: EvaliteFile.fromPath(filePath),
        expected: EvaliteFile.fromPath(filePath),
      },
    ],
  });
});

it("Should let users add files to columns", async () => {
  using fixture = loadFixture("files");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const dir = path.join(fixture.dir, FILES_LOCATION);

  const files = await readdir(dir);

  expect(files).toHaveLength(1);

  const filePath = path.join(dir, files[0]!);

  const file = await readFile(filePath);

  expect(file).toBeTruthy();

  await using adapter = createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  expect(evals.FilesWithColumns![0]).toMatchObject({
    results: [
      {
        rendered_columns: [
          {
            label: "Column",
            value: EvaliteFile.fromPath(filePath),
          },
        ],
      },
    ],
  });
});

it("Should let users add files to experimental_customColumns", async () => {
  using fixture = loadFixture("experimental_columns");

  const captured = captureStdout();

  await runVitest({
    cwd: fixture.dir,
    path: undefined,
    testOutputWritable: captured.writable,
    mode: "run-once-and-exit",
  });

  const dir = path.join(fixture.dir, FILES_LOCATION);

  const files = await readdir(dir);

  expect(files).toHaveLength(1);

  const filePath = path.join(dir, files[0]!);

  const file = await readFile(filePath);

  expect(file).toBeTruthy();

  await using adapter = createSqliteAdapter(fixture.dbLocation);
  const evals = await getEvalsAsRecordViaAdapter(adapter);

  expect(evals.experimental_customColumns![0]).toMatchObject({
    results: [
      {
        rendered_columns: [
          {
            label: "Column",
            value: EvaliteFile.fromPath(filePath),
          },
        ],
      },
    ],
  });
});

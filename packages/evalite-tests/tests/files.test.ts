import { EvaliteFile } from "evalite";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";
import { FILES_LOCATION } from "evalite/backend-only-constants";

it("Should save files returned from task() in node_modules", async () => {
  await using fixture = await loadFixture("files");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const dir = path.join(fixture.dir, FILES_LOCATION);

  const files = await readdir(dir);

  expect(files).toHaveLength(1);

  const filePath = path.join(dir, files[0]!);

  const file = await readFile(filePath);

  expect(file).toBeTruthy();

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals).toMatchObject({
    Files: [
      {
        evals: [
          {
            output: EvaliteFile.fromPath(filePath),
          },
        ],
      },
    ],
  });
});

it("Should save files reported in traces", async () => {
  await using fixture = await loadFixture("files");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const dir = path.join(fixture.dir, FILES_LOCATION);

  const files = await readdir(dir);

  expect(files).toHaveLength(1);

  const filePath = path.join(dir, files[0]!);

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals).toMatchObject({
    FilesWithTraces: [
      {
        evals: [
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
  await using fixture = await loadFixture("files");

  await fixture.run({
    mode: "run-once-and-exit",
    path: "files-1.eval.ts",
  });

  expect(fixture.getOutput()).toContain(`.png`);
  expect(fixture.getOutput()).not.toContain(`__EvaliteFile`);
});

it("Should let users add files to data().input and data().expected", async () => {
  await using fixture = await loadFixture("files");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const dir = path.join(fixture.dir, FILES_LOCATION);

  const files = await readdir(dir);

  expect(files).toHaveLength(1);

  const filePath = path.join(dir, files[0]!);

  const file = await readFile(filePath);

  expect(file).toBeTruthy();

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals.FilesInInput![0]).toMatchObject({
    evals: [
      {
        input: EvaliteFile.fromPath(filePath),
        expected: EvaliteFile.fromPath(filePath),
      },
    ],
  });
});

it("Should let users add files to columns", async () => {
  await using fixture = await loadFixture("files");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const dir = path.join(fixture.dir, FILES_LOCATION);

  const files = await readdir(dir);

  expect(files).toHaveLength(1);

  const filePath = path.join(dir, files[0]!);

  const file = await readFile(filePath);

  expect(file).toBeTruthy();

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals.FilesWithColumns![0]).toMatchObject({
    evals: [
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
  await using fixture = await loadFixture("experimental_columns");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  const dir = path.join(fixture.dir, FILES_LOCATION);

  const files = await readdir(dir);

  expect(files).toHaveLength(1);

  const filePath = path.join(dir, files[0]!);

  const file = await readFile(filePath);

  expect(file).toBeTruthy();

  const evals = await getSuitesAsRecordViaStorage(fixture.storage);

  expect(evals.experimental_customColumns![0]).toMatchObject({
    evals: [
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

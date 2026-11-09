import { existsSync } from "fs";
import path from "path";
import { expect, it } from "vitest";
import { loadFixture } from "./test-utils.js";

it("Should not create cache directory when cacheEnabled is false", async () => {
  await using fixture = await loadFixture("issue-354");

  await fixture.run({
    mode: "run-once-and-exit",
    cacheEnabled: false,
  });

  const cacheDir = path.join(fixture.dir, "node_modules", ".evalite");
  expect(
    existsSync(cacheDir),
    "Cache directory should not exist when cacheEnabled is false"
  ).toBe(false);
});

it("Should create cache directory when cacheEnabled is true", async () => {
  await using fixture = await loadFixture("issue-354");

  await fixture.run({
    mode: "run-once-and-exit",
    cacheEnabled: true,
  });

  const cacheDir = path.join(fixture.dir, "node_modules", ".evalite");
  expect(
    existsSync(cacheDir),
    "Cache directory should exist when cacheEnabled is true"
  ).toBe(true);
});

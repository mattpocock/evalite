import { it } from "vitest";
import type { Evaluhealth } from "../types.js";
import { SqliteStorage } from "./sqlite.js";
import { InMemoryStorage } from "./in-memory.js";

export type StorageTestFactory = {
  name: string;
  factory: () => Promise<Evaluhealth.Storage>;
};

/**
 * Registry of all storage to test. Add new storage here.
 */
const ADAPTERS_TO_TEST: StorageTestFactory[] = [
  {
    name: "SqliteStorage",
    factory: async () => SqliteStorage.create(":memory:"),
  },
  {
    name: "InMemoryStorage",
    factory: async () => InMemoryStorage.create(),
  },
];

/**
 * Test utility that runs the same test suite against all registered storage.
 * Each test will be run with `it.each` for every storage in ADAPTERS_TO_TEST.
 *
 * @param name - Name of the test
 * @param testFn - Async function that receives a factory to create fresh storage instances
 *
 * @example
 * testStorage("creates run with correct runType", async (getStorage) => {
 *   await using storage = await getStorage();
 *   const run = await storage.runs.create({ runType: "full" });
 *   expect(run.runType).toBe("full");
 * });
 */
export function testAllStorage(
  name: string,
  testFn: (getStorage: () => Promise<Evaluhealth.Storage>) => Promise<void>
): void {
  it.each(ADAPTERS_TO_TEST)(`$name - ${name}`, async ({ factory }) => {
    await testFn(factory);
  });
}

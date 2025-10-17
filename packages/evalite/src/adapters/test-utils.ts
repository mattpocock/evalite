import { it } from "vitest";
import type { EvaliteAdapter } from "./types.js";
import { SqliteAdapter } from "./sqlite.js";

export type AdapterTestFactory = {
  name: string;
  factory: () => Promise<EvaliteAdapter>;
};

/**
 * Registry of all adapters to test. Add new adapters here.
 */
const ADAPTERS_TO_TEST: AdapterTestFactory[] = [
  {
    name: "SqliteAdapter",
    factory: async () => SqliteAdapter.create(":memory:"),
  },
];

/**
 * Test utility that runs the same test suite against all registered adapters.
 * Each test will be run with `it.each` for every adapter in ADAPTERS_TO_TEST.
 *
 * @param name - Name of the test
 * @param testFn - Async function that receives a factory to create fresh adapter instances
 *
 * @example
 * testAdapter("creates run with correct runType", async (getAdapter) => {
 *   await using adapter = await getAdapter();
 *   const run = await adapter.runs.create({ runType: "full" });
 *   expect(run.runType).toBe("full");
 * });
 */
export function testAllAdapters(
  name: string,
  testFn: (getAdapter: () => Promise<EvaliteAdapter>) => Promise<void>
): void {
  it.each(ADAPTERS_TO_TEST)(`$name - ${name}`, async ({ factory }) => {
    await testFn(factory);
  });
}

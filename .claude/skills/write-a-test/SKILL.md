---
name: write-a-test
description: Write integration tests for the evalite monorepo. Use when creating test fixtures, writing test cases, reproducing bugs with tests, or doing TDD in this project.
user-invocable: false
---

# Write a Test

## Quick start

Tests live in `packages/evalite-tests/`. Each test needs two things:

1. **A fixture** in `packages/evalite-tests/tests/fixtures/<fixture-name>/` containing one or more `.eval.ts` files
2. **A test file** (or test case in an existing file) in `packages/evalite-tests/tests/*.test.ts`

## Creating a fixture

Create a directory under `tests/fixtures/` with at least one `.eval.ts` file:

```ts
// packages/evalite-tests/tests/fixtures/my-feature/my-feature.eval.ts
import { evalite } from "evalite";

evalite("My Feature", {
  data: () => [{ input: "abc", expected: "abcdef" }],
  task: async (input) => {
    return input + "def";
  },
  scorers: [
    {
      name: "Pass",
      scorer: ({ output, expected }) => ({
        score: output === expected ? 1 : 0,
      }),
    },
  ],
});
```

Key rules for fixtures:

- Each `.eval.ts` file is a standalone evalite eval - no vitest imports here
- Fixtures are copied to a temporary `playground/` directory at runtime (via `loadFixture`)
- The fixture name is the directory name

## Writing the test

```ts
// packages/evalite-tests/tests/my-feature.test.ts
import { expect, it } from "vitest";
import { getSuitesAsRecordViaStorage, loadFixture } from "./test-utils.js";

it("Should do the thing", async () => {
  await using fixture = await loadFixture("my-feature");

  await fixture.run({
    mode: "run-once-and-exit",
  });

  // Assert on stdout output
  expect(fixture.getOutput()).toContain("Score  100%");

  // Or assert on stored data
  const suites = await getSuitesAsRecordViaStorage(fixture.storage);
  expect(suites["My Feature"]).toMatchObject([
    {
      name: "My Feature",
      evals: [{ scores: [{ name: "Pass", score: 1 }] }],
    },
  ]);
});
```

## Test utilities (from `test-utils.ts`)

- **`loadFixture(name)`** - Copies fixture to temp dir, returns handle with `run()`, `storage`, `dir`, `getOutput()`, `getVitest()`
- **`getSuitesAsRecordViaStorage(storage)`** - Returns all suites keyed by name, with inline evals/scores/traces
- **`triggerWatchModeRerun(vitest)`** - For watch-mode tests: triggers rerun and waits for completion
- **`overrideExit(fn)`** / **`overrideConsoleError(fn)`** - Disposable overrides for testing error paths

## `fixture.run()` options

| Option           | Type                                                                          | Notes                                                    |
| ---------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| `mode`           | `"run-once-and-exit"` \| `"watch-for-file-changes"` \| `"run-once-and-serve"` | Almost always use `"run-once-and-exit"`                  |
| `enableServer`   | `boolean`                                                                     | Default `false`. Enable if testing server/cache features |
| `cacheEnabled`   | `boolean`                                                                     | Enable AI SDK caching                                    |
| `scoreThreshold` | `number`                                                                      | Set pass/fail threshold                                  |
| `outputPath`     | `string`                                                                      | Custom output path                                       |
| `path`           | `string`                                                                      | Filter to specific eval file                             |

## Running tests

```bash
# Run all tests
pnpm --filter evalite-tests test

# Run in watch mode (recommended during development)
pnpm --filter evalite-tests dev

# Run a specific test file
cd packages/evalite-tests && npx vitest run tests/my-feature.test.ts
```

## Build before testing

The `evalite` package must be built before running tests:

```bash
pnpm --filter evalite build && pnpm --filter evalite-tests test
```

During development, use `pnpm dev` from the repo root to watch both packages.

## Naming conventions for bug reproductions

When reproducing a GitHub issue, name the fixture `issue-<number>`:

```
tests/fixtures/issue-331/
  eval1.eval.ts
  eval2.eval.ts
```

And reference the issue in the test name:

```ts
it("Should calculate summary score correctly (issue 331)", async () => {
  await using fixture = await loadFixture("issue-331");
  // ...
});
```

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Evaluhealth is a TypeScript-native, local-first tool for testing LLM-powered apps built on Vitest. It allows developers to write evaluations (evals) as `.eval.ts` files that run like tests.

## Configuration

The primary configuration method is `evaluhealth.config.ts`. While `vitest.config.ts` is still supported for backward compatibility, it is not documented and `evaluhealth.config.ts` should be used for all configuration needs.

## Development Commands

**Development mode** (recommended for working on Evaluhealth itself):

```bash
pnpm run dev
```

This runs:

- TypeScript type checker on `evaluhealth` package
- Tests in `evaluhealth-tests` package
- Live reload for both packages

**Build all packages**:

```bash
pnpm build
```

This builds `evaluhealth` package first, then `evaluhealth-ui`, copying UI assets to `packages/evaluhealth/dist/ui`.

**Run CI pipeline** (build, test, lint):

```bash
pnpm ci
```

**Test the example evals**:

```bash
pnpm run example
# Or: cd packages/example && pnpm evaluhealth watch
```

**Run single package tests**:

```bash
cd packages/evaluhealth && pnpm test
cd packages/evaluhealth-tests && pnpm test
```

**Lint a package**:

```bash
cd packages/evaluhealth && pnpm lint
```

## Working with pnpm Filters

When working on specific packages in this monorepo, **use pnpm's `--filter` flag** to run commands on specific packages.

### Common Filter Commands

**Build a specific package**:

```bash
pnpm --filter evaluhealth build
pnpm --filter evaluhealth-ui build
```

**Run tests for a specific package**:

```bash
pnpm --filter evaluhealth-tests test
```

**Run dev mode for a specific package**:

```bash
pnpm --filter evaluhealth dev
pnpm --filter evaluhealth-ui dev
```

**Lint a specific package**:

```bash
pnpm --filter evaluhealth lint
pnpm --filter evaluhealth-tests lint
```

### Filter Patterns

pnpm supports several filter patterns:

- `--filter evaluhealth` - Run task for the `evaluhealth` package only
- `--filter evaluhealth...` - Run task for `evaluhealth` and all its dependencies
- `--filter ...evaluhealth` - Run task for `evaluhealth` and all packages that depend on it
- `--filter "./packages/*"` - Run task for all packages in the packages directory
- `--filter "!evaluhealth"` - Run task for all packages except `evaluhealth`

### Examples for Common Workflows

**Working on the main evaluhealth package**:

```bash
# Build evaluhealth and watch for changes
pnpm --filter evaluhealth dev

# Run tests after making changes
pnpm --filter evaluhealth test
```

**Working on the UI**:

```bash
# Build evaluhealth first, then start UI dev server
pnpm run build:evaluhealth && pnpm --filter evaluhealth-ui dev
```

**Working on integration tests**:

```bash
# Ensure evaluhealth is built before running tests
pnpm run build && pnpm --filter evaluhealth-tests test
```

### When to Use Filters

**Use filters when**:

- You need to run commands on specific packages
- You want to avoid changing directories
- You're running build, test, or lint tasks

**Direct package commands are fine for**:

- Quick one-off commands (like `pnpm install`)
- Running the evaluhealth CLI itself (e.g., `cd packages/example && pnpm evaluhealth watch`)
- When already in the package directory

## Architecture

### Monorepo Structure

This is a pnpm workspace:

- **`packages/evaluhealth`**: Main package that users install. Exports the `evaluhealth()` function, CLI binary (`evaluhealth`), server, database layer, and utilities. Built with TypeScript.

- **`packages/evaluhealth-core`**: Shared core utilities (currently appears to be deprecated or minimal)

- **`packages/evaluhealth-tests`**: Integration tests for evaluhealth functionality

- **`packages/example`**: Example eval files demonstrating usage patterns (e.g., `example.eval.ts`, `traces.eval.ts`)

- **`apps/evaluhealth-ui`**: React-based web UI that displays eval results. Built with Vite, TanStack Router, and Tailwind. Gets copied to `packages/evaluhealth/dist/ui` during build via the `after-build` script.

- **`apps/evaluhealth-docs`**: Documentation site

### Core Concepts

**Eval files**: Files matching `*.eval.ts` (or `.eval.mts`) that contain `evaluhealth()` calls. These define:

- A dataset (via `data()` function returning input/expected pairs)
- A task (the LLM interaction to test)
- Scorers (functions that evaluate output quality)
- Optional columns for custom data display

**Execution flow**:

1. The `evaluhealth` CLI uses Vitest under the hood to discover and run `*.eval.ts` files
2. Each eval creates a Vitest `describe` block with concurrent `it` tests for each data point
3. Results are stored in a SQLite database (`evaluhealth.db`)
4. A Fastify server serves the UI and provides WebSocket updates during runs
5. Files (images, audio, etc.) are saved to `.evaluhealth` directory

**Key architecture points**:

- Uses Vitest's `inject("cwd")` to get the working directory
- Supports async iterables (streaming) from tasks via `executeTask()`
- Files in input/output/expected are automatically detected and saved using `createEvaluhealthFileIfNeeded()`
- Traces can be reported via `reportTraceLocalStorage` for nested LLM calls
- Integrates with AI SDK via `evaluhealth/ai-sdk` export (provides `traceAISDKModel()`)

### Database Layer

SQLite database (`evaluhealth.db`) stores:

- Runs (full or partial)
- Evals (distinct eval names with metadata)
- Results (individual test case results with scores, traces, columns)
- Scores and traces are stored as JSON

Key queries in `packages/evaluhealth/src/db.ts`:

- `getEvals()`, `getResults()`, `getScores()`, `getTraces()`
- `getMostRecentRun()`, `getPreviousCompletedEval()`

### Server & UI

The Fastify server in `packages/evaluhealth/src/server.ts`:

- Serves the UI from `dist/ui/`
- Provides REST API at `/api/*` (menu-items, server-state, evals, results, etc.)
- WebSocket endpoint at `/api/socket` for live updates during eval runs

## Important Notes

**Linking for local development**: If you need to test the global `evaluhealth` command locally:

```bash
pnpm build
cd packages/evaluhealth && npm link
```

**Node version**: Requires Node.js >= 22

**Environment setup for examples**: Create a `.env` file in `packages/example` with:

```
OPENAI_API_KEY=your-api-key
```

**File extensions**: Both `.eval.ts` and `.eval.mts` files are supported (see changeset #151)

## Changesets

To add a changeset, write a new file to the `.changeset` directory.

The file should be named `0000-your-change.md`. Decide yourself whether to make it a patch, minor, or major change.

The format of the file should be:

```md
---
"evaluhealth": patch
---

Description of the change.
```

The description of the change should be user-facing, describing which features were added or bugs were fixed.

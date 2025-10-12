# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Evalite is a TypeScript-native, local-first tool for testing LLM-powered apps built on Vitest. It allows developers to write evaluations (evals) as `.eval.ts` files that run like tests.

## Development Commands

**Development mode** (recommended for working on Evalite itself):

```bash
pnpm run dev
```

This runs:

- TypeScript type checker on `evalite` and `evalite-core` packages
- Tests in `evalite-tests` package
- UI dev server at http://localhost:5173
- `evalite watch` on examples in `packages/example`

**On WSL**: Use `pnpm run wsl:dev` instead

**Build all packages**:

```bash
pnpm build
```

**Run CI pipeline** (build, test, lint):

```bash
pnpm ci
```

**Test the example evals**:

```bash
pnpm run test-example
# Or: cd packages/example && pnpm evalite watch
```

**Run single package tests**:

```bash
cd packages/evalite && pnpm test
cd packages/evalite-tests && pnpm test
```

**Lint a package**:

```bash
cd packages/evalite && pnpm lint
```

## Working with TurboRepo Filters

When working on specific packages in this monorepo, **prefer using TurboRepo's `--filter` flag** instead of changing directories. This ensures that all dependencies are built in the correct order before running tasks.

### Why Use Filters?

TurboRepo's filter system:

- Automatically builds dependencies before running tasks (e.g., builds `evalite` before running `evalite-tests`)
- Leverages Turbo's caching for faster builds
- Ensures proper dependency resolution based on `turbo.json` configuration
- Provides better visibility into the task dependency graph

### Common Filter Commands

**Build a specific package** (and its dependencies):

```bash
pnpm turbo build --filter=evalite
pnpm turbo build --filter=evalite-ui
```

**Run tests for a specific package** (builds dependencies first):

```bash
pnpm turbo test --filter=evalite-tests
```

**Run dev mode for a specific package**:

```bash
pnpm turbo dev --filter=evalite-ui
pnpm turbo dev --filter=evalite
```

**Lint a specific package** (ensures it's built first):

```bash
pnpm turbo lint --filter=evalite
pnpm turbo lint --filter=evalite-tests
```

**Run multiple tasks on a filtered package**:

```bash
pnpm turbo build test lint --filter=evalite
```

### Filter Patterns

TurboRepo supports several filter patterns:

- `--filter=evalite` - Run task for the `evalite` package only
- `--filter=evalite...` - Run task for `evalite` and all its dependencies
- `--filter=...evalite` - Run task for `evalite` and all packages that depend on it
- `--filter=./packages/*` - Run task for all packages in the packages directory
- `--filter=!evalite` - Run task for all packages except `evalite`

### Examples for Common Workflows

**Working on the main evalite package**:

```bash
# Build evalite and watch for changes
pnpm turbo dev --filter=evalite

# Run tests after making changes
pnpm turbo test --filter=evalite
```

**Working on the UI**:

```bash
# Builds evalite first, then starts UI dev server
pnpm turbo dev --filter=evalite-ui
```

**Working on integration tests**:

```bash
# Ensures evalite and evalite-ui are built before running tests
pnpm turbo test --filter=evalite-tests
```

**Building multiple related packages**:

```bash
# Build evalite and all packages that depend on it
pnpm turbo build --filter=...evalite
```

### When to Use vs. Not Use Filters

**Use filters when**:

- You need to ensure dependencies are built first
- You want to leverage Turbo's caching
- You're running build, test, or lint tasks
- You're working in a CI/CD environment

**Direct package commands are fine for**:

- Quick one-off commands (like `pnpm install`)
- Running the evalite CLI itself (e.g., `cd packages/example && pnpm evalite watch`)
- Commands that don't have dependencies on other packages

## Architecture

### Monorepo Structure

This is a pnpm workspace with Turborepo for task orchestration:

- **`packages/evalite`**: Main package that users install. Exports the `evalite()` function, CLI binary (`evalite`), server, database layer, and utilities. Built with TypeScript.

- **`packages/evalite-core`**: Shared core utilities (currently appears to be deprecated or minimal)

- **`packages/evalite-tests`**: Integration tests for evalite functionality

- **`packages/example`**: Example eval files demonstrating usage patterns (e.g., `example.eval.ts`, `traces.eval.ts`)

- **`apps/evalite-ui`**: React-based web UI that displays eval results. Built with Vite, TanStack Router, and Tailwind. Gets copied to `packages/evalite/dist/ui` during build via the `after-build` script.

- **`apps/evalite-docs`**: Documentation site

### Core Concepts

**Eval files**: Files matching `*.eval.ts` (or `.eval.mts`) that contain `evalite()` calls. These define:

- A dataset (via `data()` function returning input/expected pairs)
- A task (the LLM interaction to test)
- Scorers (functions that evaluate output quality)
- Optional columns for custom data display

**Execution flow**:

1. The `evalite` CLI uses Vitest under the hood to discover and run `*.eval.ts` files
2. Each eval creates a Vitest `describe` block with concurrent `it` tests for each data point
3. Results are stored in a SQLite database (`evalite.db`)
4. A Fastify server serves the UI and provides WebSocket updates during runs
5. Files (images, audio, etc.) are saved to `.evalite` directory

**Key architecture points**:

- Uses Vitest's `inject("cwd")` to get the working directory
- Supports async iterables (streaming) from tasks via `executeTask()`
- Files in input/output/expected are automatically detected and saved using `createEvaliteFileIfNeeded()`
- Traces can be reported via `reportTraceLocalStorage` for nested LLM calls
- Integrates with AI SDK via `evalite/ai-sdk` export (provides `traceAISDKModel()`)

### Database Layer

SQLite database (`evalite.db`) stores:

- Runs (full or partial)
- Evals (distinct eval names with metadata)
- Results (individual test case results with scores, traces, columns)
- Scores and traces are stored as JSON

Key queries in `packages/evalite/src/db.ts`:

- `getEvals()`, `getResults()`, `getScores()`, `getTraces()`
- `getMostRecentRun()`, `getPreviousCompletedEval()`

### Server & UI

The Fastify server in `packages/evalite/src/server.ts`:

- Serves the UI from `dist/ui/`
- Provides REST API at `/api/*` (menu-items, server-state, evals, results, etc.)
- WebSocket endpoint at `/api/socket` for live updates during eval runs

## Important Notes

**Linking for local development**: If you need to test the global `evalite` command locally:

```bash
pnpm build
cd packages/evalite && npm link
```

**Node version**: Requires Node.js >= 22

**Environment setup for examples**: Create a `.env` file in `packages/example` with:

```
OPENAI_API_KEY=your-api-key
```

**File extensions**: Both `.eval.ts` and `.eval.mts` files are supported (see changeset #151)

**Turbo dependency graph**: Most tasks depend on `^build` (build dependencies first). The `after-build` task runs after `build` completes.

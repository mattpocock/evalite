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

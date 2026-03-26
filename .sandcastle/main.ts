// Sequential Reviewer — implement-then-review loop
//
// This template drives a two-phase workflow per issue:
//   Phase 1 (Implement): A sonnet agent picks an open GitHub issue, works on it
//                        on a dedicated branch, commits the changes, and signals
//                        completion.
//   Phase 2 (Review):    A second sonnet agent reviews the branch diff and either
//                        approves it or makes corrections directly on the branch.
//
// The outer loop repeats up to MAX_ITERATIONS times, processing one issue per
// iteration. This is a middle-complexity option between the simple-loop (no review
// gate) and the parallel-planner (concurrent execution with a planning phase).
//
// Usage:
//   npx tsx .sandcastle/main.ts
// Or add to package.json:
//   "scripts": { "sandcastle": "npx tsx .sandcastle/main.ts" }

import * as sandcastle from "@ai-hero/sandcastle";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Maximum number of implement→review cycles to run before stopping.
// Each cycle works on one issue. Raise this to process more issues per run.
const MAX_ITERATIONS = 10;

// Hooks run inside the sandbox before the agent starts each iteration.
// pnpm install ensures the sandbox always has fresh dependencies.
const hooks = {
  onSandboxReady: [{ command: "pnpm install" }],
};

// Copy node_modules from the host into the worktree before each sandbox
// starts. Avoids a full pnpm install from scratch; the hook above handles
// platform-specific binaries and any packages added since the last copy.
const copyToSandbox = ["node_modules"];

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // -------------------------------------------------------------------------
  // Phase 1: Implement
  //
  // A sonnet agent picks the next open GitHub issue, creates a branch, writes
  // the implementation (using RGR: Red → Green → Repeat → Refactor), and
  // commits the result.
  //
  // The agent signals completion via <promise>COMPLETE</promise> when done.
  // The result contains the branch name the agent worked on.
  // -------------------------------------------------------------------------
  const implement = await sandcastle.run({
    hooks,
    copyToSandbox,
    name: "implementer",
    maxIterations: 5,
    model: "claude-opus-4-6",
    promptFile: "./.sandcastle/implement-prompt.md",
  });

  // Extract the branch the agent worked on so the reviewer can target it.
  const branch = implement.branch;

  if (!implement.commits.length) {
    console.log("Implementation agent made no commits. Skipping review.");
    continue;
  }

  console.log(`\nImplementation complete on branch: ${branch}`);
  console.log(`Commits: ${implement.commits.length}`);

  // -------------------------------------------------------------------------
  // Phase 2: Review
  //
  // A second sonnet agent reviews the diff of the branch produced by Phase 1.
  // It uses the {{BRANCH}} prompt argument to inspect the right branch, and
  // either approves or makes corrections directly on the branch.
  // -------------------------------------------------------------------------
  await sandcastle.run({
    hooks,
    copyToSandbox,
    name: "reviewer",
    maxIterations: 1,
    model: "claude-sonnet-4-6",
    promptFile: "./.sandcastle/review-prompt.md",
    // Prompt arguments substitute {{BRANCH}} in review-prompt.md before the
    // agent sees the prompt.
    promptArgs: {
      BRANCH: branch,
    },
    branch,
  });

  console.log("\nReview complete.");
}

console.log("\nAll done.");

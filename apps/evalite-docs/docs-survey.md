# Evalite Documentation Survey

## Documentation Hierarchy

### HOME PAGE

**Path:** `/` (index.mdx)
**Title:** Test AI-powered apps in TypeScript

**User Perspective Summary:**
Landing page introducing Evalite as a simple solution for making evals easy. Presents value proposition with feature cards highlighting key benefits: familiar test-runner API, instant feedback with local UI, Vitest foundation, no vendor lock-in, and CI-friendly with static exports and score thresholds.

**What Users Learn:**

- Evalite's core value proposition: making evals simple for AI-powered apps
- Key differentiators: local-first, test runner approach, beautiful UI
- High-level feature overview before diving into guides

**Key Topics:**

- Feature highlights in card format
- Quick "Get Started" CTA to quickstart
- Visual hero section with tagline

---

## GUIDES SECTION

### 1. What Is Evalite?

**Path:** `/guides/what-is-evalite`

**User Perspective Summary:**
Conceptual introduction explaining that Evalite runs evals locally (like Jest/Vitest for AI apps). Explains the fundamental concept that evals are to AI apps what tests are to regular apps - they provide scores (0-100) instead of pass/fail. Shows a basic code example introducing the three core elements: data, task, and scorers.

**What Users Learn:**

- Evals are like tests but for AI-powered apps
- Evals return scores (0-100) instead of pass/fail
- Basic structure of an eval file with data/task/scorers
- Why Evalite exists (local-only, no vendor lock-in, open source)
- Comparison to cloud-based eval services

**Key Topics:**

- Definition of evals
- `.eval.ts` file structure
- Local-first philosophy
- Comparison to Jest/Vitest

---

### 2. Quickstart

**Path:** `/guides/quickstart`

**User Perspective Summary:**
Step-by-step installation and setup guide. Walks users through installing dependencies (evalite, vitest, autoevals), adding a script to package.json, creating their first eval file, running it, and viewing results in the UI. Includes troubleshooting section for common SQLite binding issues.

**What Users Learn:**

- How to install Evalite in an existing project
- How to create their first eval file
- How to run evals and view results
- Where to find the UI (localhost:3006)
- Common installation issues and solutions

**Key Topics:**

- Installation steps
- First eval creation
- Running evals with `evalite watch`
- UI access
- Troubleshooting better-sqlite3 errors

---

### 3. The Dev Loop

**Path:** `/guides/dev-loop`

**User Perspective Summary:**
Consolidated guide on development workflow optimizations. Covers watch mode for continuous testing, running specific eval files via CLI, skipping entire evals temporarily, and focusing on individual test cases. Written in extremely concise style, sacrificing grammar for brevity. Unified location for development iteration patterns previously scattered across multiple tips.

**What Users Learn:**

- How to use watch mode and serve mode
- Hiding table output with --hideTable
- Running specific eval files via CLI path filtering
- Temporarily disabling evals with evalite.skip()
- Focusing on specific test cases with only flag
- Development workflow optimization patterns

**Key Topics:**

- Watch mode: `evalite watch`, auto-rerun on changes
- Serve mode: alternative for long-running evals
- --hideTable flag for cleaner console output
- CLI path filtering (single file, multiple files, patterns)
- evalite.skip() method
- only flag on data entries
- Works with watch, serve, and run modes

---

### 4. Scorers

**Path:** `/guides/scorers`

**User Perspective Summary:**
Guide on creating and using scorers to evaluate LLM output. Covers inline scorers, reusable scorers with `createScorer()`, scorer properties (input/output/expected), returning metadata, and using the autoevals library. File ends at "Scorer Metadata" section.

**What Users Learn:**

- How to define scorers inline vs reusable
- Accessing input, output, and expected values
- Type safety with generic parameters
- Returning metadata alongside scores
- Using autoevals library

**Key Topics:**

- Inline scorers
- createScorer() API
- Scorer properties and typing
- Metadata in scorer responses
- Integration with autoevals

---

### 4. Configuration

**Path:** `/guides/configuration`

**User Perspective Summary:**
Explains how to configure Evalite using `evalite.config.ts`. Covers Evalite-specific options like testTimeout, maxConcurrency, scoreThreshold, hideTable, server port, and trialCount. Emphasizes that Evalite is built on Vitest so all Vitest configuration options work.

**What Users Learn:**

- How to create evalite.config.ts
- Available configuration options
- Important options: maxConcurrency and testTimeout
- Relationship to Vitest configuration
- How to optimize performance and manage API rate limits

**Key Topics:**

- evalite.config.ts creation
- Configuration options reference
- maxConcurrency for parallel execution
- testTimeout for long-running evals
- Vitest compatibility

---

## TIPS SECTION

### 1. Customize The UI

**Path:** `/tips/customize-the-ui`

**User Perspective Summary:**
Shows how to customize which columns appear in the Evalite UI using the `columns` attribute. By default, Evalite shows input, expected, and output - but users can override this to show only specific data or derived values.

**What Users Learn:**

- Default columns (input, expected, output)
- How to define custom columns
- Accessing result properties in columns function
- Simplifying UI for complex data structures

**Key Topics:**

- Default UI columns
- columns attribute on evalite()
- Custom column definitions
- Label and value structure

---

### 2. CI/CD

**Path:** `/tips/run-evals-on-ci-cd`

**User Perspective Summary:**
Comprehensive guide for running Evalite in CI/CD pipelines. Covers static UI export for viewing results as artifacts, score thresholds to fail builds (with detailed subsections on threshold flag usage, configuration file settings, and precedence rules), JSON export for programmatic analysis, and includes a complete GitHub Actions example.

**What Users Learn:**

- How to export static UI bundles
- How to view exported results
- Running evals in run-once mode
- Setting score thresholds via CLI flag and config file
- Score threshold precedence rules (CLI overrides config)
- How thresholds work across all modes (run, watch, serve, export)
- Exporting JSON for analysis
- GitHub Actions integration

**Key Topics:**

- evalite export command
- Static HTML bundle structure
- Score thresholds (expanded from deleted /tips/score-thresholds):
  - --threshold flag usage
  - scoreThreshold in config file
  - Works with all modes
  - Exit codes for CI/CD
  - CLI precedence over config
- JSON export with --outputPath
- CI/CD workflow examples
- Artifact uploading

---

### 3. Adding Traces

**Path:** `/tips/adding-traces`

**User Perspective Summary:**
Brief introduction to tracing individual LLM calls within tasks using `reportTrace()`. Shows how to track start/end times, token usage, and input/output for each LLM call. References Vercel AI SDK tip for automatic tracing.

**What Users Learn:**

- What traces are and why to use them
- How to manually report traces
- Tracking timing and token usage
- reportTrace is a no-op in production

**Key Topics:**

- reportTrace() API
- Tracking LLM call metrics
- Performance timing
- Token usage tracking
- Cross-reference to AI SDK integration

---

### 4. Vercel AI SDK

**Path:** `/tips/vercel-ai-sdk`

**User Perspective Summary:**
Shows integration with Vercel's AI SDK using `traceAISDKModel()` wrapper for automatic tracing. Also covers testing whole conversations by passing CoreMessage arrays as input with proper type parameters.

**What Users Learn:**

- Automatic tracing with traceAISDKModel()
- How to wrap AI SDK models
- Testing conversations with message arrays
- Type parameters for evalite function
- traceAISDKModel is a no-op in production

**Key Topics:**

- traceAISDKModel() wrapper
- AI SDK integration
- CoreMessage typing
- Conversation testing
- Type safety with generic parameters

---

### 5. Comparing Different Approaches

**Path:** `/tips/comparing-different-approaches`

**User Perspective Summary:**
Explains `evalite.each()` for A/B testing different models, prompts, or configurations on the same dataset. Shows examples comparing different models and different prompt strategies (direct vs chain-of-thought vs few-shot).

**What Users Learn:**

- A/B testing capabilities
- How to compare models
- How to compare prompt strategies
- evalite.each() API
- Variant patterns

**Key Topics:**

- evalite.each() method
- Model comparison
- Prompt strategy comparison
- Variant objects with name and input
- Task function receives variant parameter

---

### 6. Images And Media

**Path:** `/tips/images-and-media`

**User Perspective Summary:**
Comprehensive guide on working with multi-modal data (images, audio, video). Covers two approaches: files in memory (Uint8Array/Buffer) with automatic detection, and files on disk using `EvaliteFile.fromPath()`. Explains when to use each approach.

**What Users Learn:**

- Working with binary data in evals
- Automatic Uint8Array detection
- Using EvaliteFile.fromPath() for disk files
- Where files are cached (.evalite/files)
- When to use each approach

**Key Topics:**

- Files in memory (Buffers/Uint8Array)
- EvaliteFile.fromPath() API
- Automatic file detection
- File storage location
- Usage in data, tasks, traces, columns
- Decision guide: fromPath vs Buffers

---

## REFERENCE SECTION

### 1. evalite()

**Path:** `/api/evalite`

**User Perspective Summary:**
Complete API reference for the main `evalite()` function. Documents signature, all parameters (evalName, data, task, scorers, columns, trialCount), methods (skip, each), with detailed type information and examples.

**What Users Learn:**

- Full evalite() function signature
- All parameter types and options
- How to use type parameters for type safety
- evalite.skip() and evalite.each() methods
- Complete API surface area

**Key Topics:**

- Function signature with generics
- Parameter reference: evalName, data, task, scorers, columns, trialCount
- Data array structure with only flag
- Async data functions
- Inline vs reusable scorers
- Custom columns
- evalite.skip() and evalite.each() methods
- Complete example

---

### 2. CLI

**Path:** `/api/cli`

**User Perspective Summary:**
Complete CLI command reference. Documents all commands (run, watch, serve, export), their positional arguments, flags, and examples. Includes global flags and configuration notes.

**What Users Learn:**

- All available CLI commands
- Command options and flags
- How to use each command
- When to use each mode
- Global flags

**Key Topics:**

- evalite run (default)
- evalite watch
- evalite serve
- evalite export
- Positional arguments (path filtering)
- Flags: --threshold, --outputPath, --hideTable, --output, --runId
- Global flags: --help, --version
- Configuration file interaction
- Cross-references to related docs

---

### 3. defineConfig()

**Path:** `/api/define-config`

**User Perspective Summary:**
API reference for `defineConfig()` helper used in evalite.config.ts. Documents signature and all configuration options with types, defaults, and examples. Explains configuration file name conventions and Vitest integration.

**What Users Learn:**

- How to create type-safe config
- All available configuration options
- Option defaults and types
- Supported config file names
- Priority when options conflict

**Key Topics:**

- Function signature
- Configuration options: storage, server.port, scoreThreshold, hideTable, testTimeout, maxConcurrency, trialCount, setupFiles
- Complete example with all options
- Supported file names
- Vitest integration notes
- Cross-references

---

### 4. createScorer()

**Path:** `/api/create-scorer`

**User Perspective Summary:**
API reference for `createScorer()` function for building reusable scorers. Documents signature, parameters (name, description, scorer function), return values, and shows various usage patterns including async scorers, metadata, and reusable scorer libraries.

**What Users Learn:**

- createScorer() signature and type parameters
- Scorer function requirements
- Returning scores vs score objects with metadata
- Creating async/LLM-based scorers
- Building reusable scorer libraries
- Inline scorers as alternative
- Using third-party scorers (autoevals)

**Key Topics:**

- Function signature with generics
- Parameters: name, description, scorer
- Score return types (number or object)
- Metadata in responses
- Async scorer examples
- Reusable scorer patterns
- Inline scorer comparison
- autoevals integration

---

### 5. EvaliteFile

**Path:** `/api/evalite-file`

**User Perspective Summary:**
API reference for `EvaliteFile` utilities for working with media files. Documents methods (fromPath, isEvaliteFile), automatic Uint8Array detection, usage contexts, and includes guidance on when to use each approach.

**What Users Learn:**

- EvaliteFile.fromPath() method
- EvaliteFile.isEvaliteFile() type guard
- Automatic Buffer detection
- File storage location
- Usage in different contexts
- When to use fromPath vs Buffers
- Complete multi-modal example

**Key Topics:**

- fromPath() method signature
- isEvaliteFile() type guard
- Automatic Uint8Array handling
- File caching in .evalite/files
- Usage contexts: data, task output, traces, columns
- Decision guide
- Complete example
- Storage details

---

### 6. Traces

**Path:** `/api/traces`

**User Perspective Summary:**
Complete API reference for tracing functionality. Documents `reportTrace()` for manual tracing and `traceAISDKModel()` for automatic AI SDK tracing. Explains enabling traces with environment variable, what gets traced, viewing in UI, and troubleshooting.

**What Users Learn:**

- reportTrace() API and parameters
- traceAISDKModel() wrapper
- How to enable traces with EVALITE_REPORT_TRACES
- What data gets captured
- Viewing traces in UI
- Best practices
- Troubleshooting common issues

**Key Topics:**

- reportTrace() function signature
- Parameters: input, output, usage, start, end
- traceAISDKModel() wrapper
- EVALITE_REPORT_TRACES environment variable
- Automatic vs manual tracing
- Trace data structure
- UI viewing instructions
- Complete example combining both approaches
- Best practices
- Troubleshooting guide

---

### 7. runEvalite()

**Path:** `/api/run-evalite`

**User Perspective Summary:**
Complete API reference for programmatic eval execution. Documents `runEvalite()` function signature, all parameters, run modes, configuration priority, error handling, and includes multiple usage examples for different scenarios.

**What Users Learn:**

- runEvalite() function signature
- All parameters and options
- Three run modes
- Configuration priority/merging
- Error handling patterns
- Various usage scenarios
- Integration patterns

**Key Topics:**

- Function signature
- Parameters: mode, path, cwd, scoreThreshold, outputPath, hideTable, storage
- Run modes: run-once-and-exit, watch-for-file-changes, run-once-and-serve
- Configuration priority
- Error handling
- Return value behavior
- Usage examples: CI/CD, development, custom storage, multi-environment, parallel execution
- Deprecated alias note

---

### 8. Storage

**Path:** `/api/storage`

**User Perspective Summary:**
Complete API reference for storage backends. Documents built-in storage (SQLite, in-memory), the Storage interface for custom implementations, entity types, and implementation guide. Includes complete example of custom storage implementation.

**What Users Learn:**

- Built-in storage options
- createSqliteStorage() and createInMemoryStorage() functions
- Storage interface structure
- Entity types (Run, Suite, Eval, Score, Trace)
- How to implement custom storage
- Storage lifecycle management
- Query patterns
- Best practices

**Key Topics:**

- createSqliteStorage() API
- createInMemoryStorage() API
- Storage interface definition
- Entity type definitions
- Custom storage implementation guide
- Factory function pattern
- Storage lifecycle with await using
- Common query patterns
- Best practices
- Cross-references

# evalite

## 1.0.0-beta.11

### Patch Changes

- c2e07c7: Various UI improvements to bring the data table further up the page.

## 1.0.0-beta.10

### Patch Changes

- 3e0a32e: Added variant to the table displayed in the CLI

## 1.0.0-beta.9

### Patch Changes

- 895b1dd: Display errors when resolving evalite.config.ts instead of silently ignoring them.

## 1.0.0-beta.8

### Patch Changes

- df561c2: Made visual improvements to the UI, balancing colours and improving JSON output.

## 1.0.0-beta.7

### Patch Changes

- 359039c: Added the /scorers/deterministic export to allow users to use scorers without needing the AI SDK.
- 4252ccc: Added 'ai' as an optional peer dependency

## 1.0.0-beta.6

### Patch Changes

- eb5f4db: Fixed a bug where during evalite export, the summary score would be incorrectly calculated.

## 1.0.0-beta.5

### Major Changes

- 4fd065e: Removed `traceAISDKModel` in favor of `wrapAISDKModel` which includes both caching and tracing.

### Minor Changes

- 4fd065e: Added cache config & --no-cache CLI flag. Config cache via evalite.config.ts or disable with --no-cache flag.

### Patch Changes

- 4fd065e: Added cache debug mode via debugCache in runEvalite to debug cache hits/misses.
- 4fd065e: Server will now attempt to find another port if 3006 is unavailable.
- a7b0dfc: Added a theme switcher for light/dark mode to Evalite's UI

## 1.0.0-beta.4

### Patch Changes

- a963b00: Fixed a bug where when basePath was provided during exports, JavaScript and CSS assets had an extraneous leading slash.
- 659f3ba: Fixed a bug where export would not export anything if a run failed.

## 1.0.0-beta.3

### Patch Changes

- ffbe739: Improved the error message that happens when Evalite encounters an unknown error.

## 1.0.0-beta.2

### Patch Changes

- f221e0b: Add .skip() to .each()

## 1.0.0-beta.1

### Major Changes

- b64d1bb: Dropped compatibility with autoevals, and implemented our own built-in library of scorers.

### Patch Changes

- 6033c8c: Added Levenshtein distance scorer for fuzzy string matching

## 1.0.0-beta.0

### Major Changes

- 8c9fe90: Export command now uses the storage specified in the config and auto-runs if empty.
- 8c9fe90: Changed default storage to in-memory. SQLite still available via config.
- ba3d876: Removed implicit reading of vitest.config.ts/vite.config.ts files. Users must now explicitly pass Vite config via evalite.config.ts using the new `viteConfig` option. This change makes configuration more explicit and less confusing.

  **Migration Guide:**

  Before:

  ```ts
  // vitest.config.ts was automatically read
  export default defineConfig({
    test: {
      testTimeout: 60000,
    },
  });
  ```

  After:

  ```ts
  // evalite.config.ts
  import { defineConfig } from "evalite/config";
  import viteConfig from "./vite.config.ts";

  export default defineConfig({
    viteConfig: viteConfig,
    // Note: testTimeout, maxConcurrency, and setupFiles
    // must be at root level, not in viteConfig.test
    testTimeout: 60000,
    setupFiles: ["./setup.ts"],
  });
  ```

- e8a43c2: Moved storage API from evals -> suites, results -> evals. This will likely cause issues for existing SQLite databases when released, so will need migration.

### Minor Changes

- 9f0a2aa: Removed streaming text support from tasks. Process streams before returning from task() (e.g., await result.text for AI SDK).
- fb39ab9: Support .env files by default via dotenv/config. Environment variables from .env files are now automatically loaded without any configuration needed. Users no longer need to manually add `setupFiles: ["dotenv/config"]` to their evalite.config.ts.

### Patch Changes

- a9a8883: Made scorer `name` field optional. When using pre-built scorers, name and description are now automatically extracted from the scorer's return value.
- 9263870: Added rerun button to UI in watch and serve modes
- a5a0c56: Added `only` option to variants in `evalite.each()` to selectively run specific variants.
- 8f9495c: Made it so passing UI messages (from AI SDK) directly into Evalite spawns a custom UI.
- bdc5115: UI now renders simple arrays of objects and flat objects as markdown tables instead of JSON trees for better readability
- 288523b: Made better-sqlite3 an optional peer dependency

## 0.19.0

### Minor Changes

- d186618: Support custom base paths for static UI exports. Use `evalite export --basePath=/your-path` to host at non-root URLs like S3/CloudFront subpaths.

## 0.18.1

### Patch Changes

- e7cfbfb: Fixed a bug where errors at the module level were not being reported

## 0.18.0

### Minor Changes

- 7935f7b: Column functions now receive `scores` and `traces` arrays in addition to `input`, `output`, and `expected`, allowing columns to display information from scorers and traces.

## 0.17.1

### Patch Changes

- 28fc857: Fixed a bug where errors in data() were not reported

## 0.17.0

### Minor Changes

- 220a899: Upgraded to Vitest v4

## 0.16.1

### Patch Changes

- 82e3d86: Fix error logging in watch mode by restoring error details display.

## 0.16.0

### Minor Changes

- edfc4b9: Added setupFiles option to evalite.config.ts for loading environment variables and other setup files before tests run.
- 88db673: Added `evalite.config.ts` file to configure Evalite. Added `testTimeout` and `maxConcurrency` options.
- 7cc0d24: `trialCount` option for running each test case multiple times. Set in `evalite.config.ts` or per-eval in `evalite()` call to measure variance in non-deterministic evaluations. Each trial stored as separate result with unique `trial_index`.

## 0.15.0

### Minor Changes

- 39fb50e: Migrated to Vitest Annotations API for improved test progress timing. Requires Vitest 3.2.4 or later.

### Patch Changes

- 7aa5927: Removed serialization requirement for eval datasets, allowing non-serializable data like Zod schemas in input/expected fields

## 0.14.7

### Patch Changes

- ee00ab9: Added collapse functionality to expanded table rows - users can now click 'Show less' to collapse content after expanding it.

## 0.14.6

### Patch Changes

- 9609cc5: Fixed CLI table rendering exceeding terminal width due to incorrect padding calculation

## 0.14.5

### Patch Changes

- 601fa53: Moved experimental_skip to skip

## 0.14.4

### Patch Changes

- 58e4923: Fixed the icons in the UI so they show the correct statuses

## 0.14.3

### Patch Changes

- 1c25a7a: Make Node API parameters optional with sensible defaults
- 8af700d: Fixed a bug where visiting non-homepages would show an empty screen.

## 0.14.2

### Patch Changes

- 6e3a494: Fixed a bug where failed results would not show the table at all in the terminal
- 2519adb: Add --hideTable option for hiding the table

## 0.14.1

### Patch Changes

- 177c8d8: Fixed a bug where when there was no scorer, it would still show up/down indicators from previous runs.

## 0.14.0

### Minor Changes

- be75faa: Adds 'outputPath' cli config option for writing evaluation results to a file
- 9160ba3: Upgraded to Vitest 3.
- ae03644: Added Evalite serve
- fb9f096: Added static export

### Patch Changes

- 57dd386: Display error messages instead of empty objects when tests fail
- 28e4577: Rename runVitest to runEvalite as official Node API
- 7c3bf8a: Added score averages in the UI
- 7ffcf54: Make it possible to pass data as an array, not a function that returns an array.
- 2dd6cea: Fixed overflow text error on trace view
- 9a0556a: In UI, show evals without scorers as '-', not '0%'.

## 0.13.0

### Minor Changes

- dbf52f2: Added evalite.each

## 0.12.0

### Minor Changes

- 474fb8f: Upgrade Tailwind to v4 and introduce dark mode.
- f9d23fe: Migrate to AI SDK v5

### Patch Changes

- 7866bd7: Fix table truncation appearing too early in terminal output

## 0.11.6

### Patch Changes

- f6c9f27: Fixed an issue with scrollbars in the main UI

## 0.11.5

### Patch Changes

- 1d19066: Include .eval.mts files

## 0.11.4

### Patch Changes

- 60724bf: Exit code should be set to 1 for any failing tasks or timeouts

## 0.11.3

### Patch Changes

- 83611bc: Handle onTaskUpdate method being undefined in Vitest 3

## 0.11.2

### Patch Changes

- 508961b: Fixed a bug where the renderTable function would sometimes error when containing emoji's.

## 0.11.1

### Patch Changes

- e8f26aa: Allow the content to stretch to full width

## 0.11.0

### Minor Changes

- fb65ffe: Changed experimental_customColumns to columns
- 3677980: Removed @evalite/core and moved all code into evalite.

## 0.10.1

### Patch Changes

- 1c09042: Fixed an error where timeouts would result in a non-descriptive "No result present" error.
- Updated dependencies [1c09042]
  - @evalite/core@0.7.1

## 0.10.0

### Minor Changes

- 9fc6743: Changed the way types are inferred with Evalite - now, outputs will be inferred differently to 'expected' - much cleaner and less prone to errors.
- 9fc6743: Added the ability to specify scorers inline, without needing to wrap with createScorer.

### Patch Changes

- Updated dependencies [9fc6743]
- Updated dependencies [9fc6743]
  - @evalite/core@0.7.0

## 0.9.1

### Patch Changes

- 4ce56fb: Added markdown table visualisation in UI

## 0.9.0

### Minor Changes

- e3aff96: Added `--threshold`, for setting a score threshold for evals. This is useful for running on CI. If the score threshold is not met, it will fail the process.

  ```bash
  evalite --threshold=50 # Score must be greater than or equal to 50

  evalite watch --threshold=70 # Also works in watch mode
  ```

## 0.8.4

### Patch Changes

- 775b521: Adds support for missing `evalite.experimental_skip()`

## 0.8.3

### Patch Changes

- c49c460: Add --version flag

## 0.8.2

### Patch Changes

- 5676b2a: Improved the display of inputs and outputs in traces when custom columns are used.
- 12dd7fc: Re-exported the Evalite type from the 'evalite' package so users don't have to download @evalite/core to access it.
- Updated dependencies [5676b2a]
  - @evalite/core@0.6.1

## 0.8.1

### Patch Changes

- 5ac19c5: Fixed a bug where `evalite [path]` would not run the path specified.

## 0.8.0

### Minor Changes

- 7734024: Evalite is now multi-modal! Pass Uint8Arrays into data.expected, data.input or the result of task() to display them in the UI.

### Patch Changes

- bc7b27d: Added a warning for folks with out-of-date tsconfigs.
- Updated dependencies [7734024]
  - @evalite/core@0.6.0

## 0.7.4

### Patch Changes

- 7307a99: Made traceAISDKModel work with streamText.
- 6063c34: Fixed an issue where the user could override the include, mode or browser options.
- 77063eb: Made traceAISDK not fail on tool calls.

## 0.7.3

### Patch Changes

- 9cdb9b8: Made experimental_customColumns show in the TUI.
- 032bd16: Fixed an issue where testTimeout (and other config options) could not be overwritten by the user.

## 0.7.2

### Patch Changes

- f26eaaa: Run the data function as soon as evalite is called for maximum concurrency.

## 0.7.1

### Patch Changes

- b3beda6: Fixed an issue where evals within the same file were not being run concurrently.

## 0.7.0

### Minor Changes

- 4f3d446: Added experimental_customColumns to allow for customizing the columns shown by the UI.

### Patch Changes

- Updated dependencies [4f3d446]
  - @evalite/core@0.5.0

## 0.6.2

### Patch Changes

- 04c0c96: Runs now report as soon as they are complete. Failures are now reported on individual runs instead of on the entire eval.
- Updated dependencies [04c0c96]
  - @evalite/core@0.4.2

## 0.6.1

### Patch Changes

- e3f64cf: Fixed a bug where the loading indicators were not accurate on first load.
- 9d6880f: Fixed a bug where the UI was showing times in UTC.
- Updated dependencies [e3f64cf]
- Updated dependencies [9d6880f]
  - @evalite/core@0.4.1

## 0.6.0

### Minor Changes

- 5379066: Added a historical view for evals so that you can go back in time and view previous eval runs and traces.

### Patch Changes

- Updated dependencies [5379066]
  - @evalite/core@0.4.0

## 0.5.4

### Patch Changes

- 9ef8421: Made failed evaluations show a message in the UI.
- Updated dependencies [9ef8421]
  - @evalite/core@0.3.4

## 0.5.3

### Patch Changes

- 7150bbe: Allowed custom scorers to return metadata
- Updated dependencies [7150bbe]
  - @evalite/core@0.3.3

## 0.5.2

### Patch Changes

- 101179c: Added a section in the traces view to view the prompt and completion tokens
- fef1c4f: Allowed for viewing metadata along with each score
- 4d006a1: Added a view in the traces to show how long each trace took.
- Updated dependencies [101179c]
- Updated dependencies [fef1c4f]
- Updated dependencies [4d006a1]
  - @evalite/core@0.3.2

## 0.5.1

### Patch Changes

- Updated dependencies [8b23607]
- Updated dependencies [8130cc9]
  - @evalite/core@0.3.1

## 0.5.0

### Minor Changes

- 32cb0e5: Adopted sqlite as the database instead of jsonl.

  The db will now be saved to `./node_modules/.evalite` by default instead of `evalite-report.jsonl`.

### Patch Changes

- ad28d0b: Made it possible to return any async iterable from a task - more permissive than a ReadableStream.
- Updated dependencies [ad28d0b]
- Updated dependencies [32cb0e5]
- Updated dependencies [a13be9e]
  - @evalite/core@0.3.0

## 0.4.4

### Patch Changes

- 3aab797: Fixed console shortcuts during watch mode.

## 0.4.3

### Patch Changes

- 0961721: Fixed bug with running watch command

## 0.4.2

### Patch Changes

- f77cb6e: Fixed the <path> command.

## 0.4.1

### Patch Changes

- 5abbeab: Made it possible to return any async iterable from a task - more permissive than a ReadableStream.
- 74172d6: Improved report table formatting for objects.
- Updated dependencies [5abbeab]
  - @evalite/core@0.2.1

## 0.4.0

### Minor Changes

- 66e8dac: Made all evalite tests run simultaneously by default.

## 0.3.0

### Minor Changes

- 9769ab8: Added the ability to handle streams via returning a ReadableStream from an evalite task.

### Patch Changes

- Updated dependencies [9769ab8]
  - @evalite/core@0.2.0

## 0.2.1

### Patch Changes

- Updated dependencies [a520613]
  - @evalite/core@0.1.1

## 0.2.0

### Minor Changes

- 099b198: Changed createScorer so that it receives an object instead of multiple parameters.
- 099b198: Added a description field to createScorer.

### Patch Changes

- Updated dependencies [099b198]
- Updated dependencies [099b198]
  - @evalite/core@0.1.0

## 0.1.4

### Patch Changes

- eb294a7: Added a link to the eval page to view the filepath in VSCode
- Updated dependencies [eb294a7]
  - @evalite/core@0.0.5

## 0.1.3

### Patch Changes

- 213211f: Fixed broken build
- Updated dependencies [213211f]
  - @evalite/core@0.0.4

## 0.1.2

### Patch Changes

- e43c7a4: Added early version of the UI, available on localhost:3006 in watch mode.

## 0.1.1

### Patch Changes

- a6a86f1: Made table columns max width 80 chars.

## 0.1.0

### Minor Changes

- 28517ff: Removed scorers copied from autoevals. New recommendation is to use `autoevals` as the default - they are fully compatible with `evalite`.
- 28517ff: Added traceAISDKModel for tracing models with Vercel's AI SDK.
- e53a652: Added support for createScorer.

### Patch Changes

- 4ca6a7d: Initial
- Updated dependencies [4ca6a7d]
  - @evalite/core@0.0.3

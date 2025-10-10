# evalite

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

# Evalite is deprecated

Evalite is no longer maintained.

> My work has changed focus. I used to teach developers how to build AI-powered applications, and Evalite was part of that: it featured in my courses, which justified the time I spent on it. I now focus on creating AI-powered developers. Evalite is no longer part of that work, so I can't justify continuing to maintain it.

The recommended replacement is [Langfuse](https://langfuse.com).

This repo is archived, with open issues and PRs left as they stand. Forks are welcome.

## Migrating to Langfuse

Langfuse needs a server: either Langfuse Cloud or self-hosted with Docker. Evalite runs locally with no server and no account, and Langfuse does not. Your inputs, outputs, scores and traces are sent to that server.

Langfuse isn't a drop-in replacement. Several Evalite features have no equivalent, as the table shows.

| Evalite | Langfuse (`@langfuse/client` 6.x) |
| --- | --- |
| `evalite(name, { data, task, scorers })` | `langfuse.experiment.run({ name, data, task, evaluators })`. Also needs OpenTelemetry set up with `@langfuse/otel` and shut down at the end. |
| `data: [{ input, expected }]` | `data: [{ input, expectedOutput }]`. Must be an array, not a function. |
| `task: (input) => output` | `task: (item) => output`, reading `item.input`. |
| Inline scorer: `{ name, scorer: ({ input, output, expected }) => number }` | Async evaluator: `async ({ input, output, expectedOutput }) => ({ name, value })`. |
| `createScorer({ name, scorer })`, returning a number or `{ score, metadata }` | No helper. Write an async function typed `Evaluator`, returning `{ name, value, comment, metadata }`. |
| `evalite/scorers` built-ins | Mostly [autoevals](https://github.com/braintrustdata/autoevals), through `createEvaluatorFromAutoevals`. Scores may differ. `contains` is easy to write by hand. `noiseSensitivity` and `toolCallAccuracy` have no equivalent. |
| `evalite.each(variants)` | No equivalent. Call `experiment.run` once per variant and compare the runs in the Langfuse UI. |
| `runEvalite()`, the `evalite` CLI | No equivalent. Write a script that runs each experiment. There is no file discovery. |
| `scoreThreshold` | No option. Check `result.itemResults` or `result.runEvaluations` yourself and set the exit code. |
| Local UI at `localhost:3006` | The Langfuse web UI, on Cloud or self-hosted. Self-hosting with Docker Compose serves it on port 3000, and Langfuse recommends 4 cores and 16 GiB of memory for the VM. `result.format()` prints a summary to the terminal. |
| `wrapAISDKModel`, `reportTrace` | AI SDK telemetry: `experimental_telemetry` on v6, `@langfuse/vercel-ai-sdk` on v7. For manual traces, `startActiveObservation` from `@langfuse/tracing`. |
| `EvaliteFile` | Closest is `LangfuseMedia` from `@langfuse/core`. It isn't a direct replacement. |
| Watch mode, model cache, `only`, `evalite.skip`, `trialCount`, `columns`, `evalite export`, local storage with no setup | No equivalent. |

## Migration prompt

Paste this into your coding agent:

```text
Migrate this project's evals from Evalite to Langfuse's experiment runner. Keep the datasets, the task logic and the scoring logic the same. Replace only the harness.

Before you change anything:

1. Find every use: imports from `evalite` and `evalite/*`, `*.eval.ts` files, `evalite.config.*`, and `evalite` in package.json scripts.
2. Read https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk.md. After installing, check the types in `@langfuse/client`. If they disagree with these instructions, follow the types and tell me.
3. Langfuse needs a server (Langfuse Cloud or self-hosted). Inputs, outputs, scores and traces are sent to it. If you can't tell which one I'm using, ask. Never invent keys, and never read or print my `.env`.

Install (needs Node 22+):

- Add `@langfuse/client` and `@langfuse/otel`.
- If `@opentelemetry/sdk-node` is already installed below 0.300, leave it. Otherwise add `@opentelemetry/sdk-node@0.223.0`. With npm, the latest version (0.301.0) fails to install next to `@langfuse/otel`.
- Don't use the older `langfuse` or `langfuse-vercel` packages, even if the project already has them.

Create `langfuse-setup.ts` next to the evals, one per self-contained directory of evals. It creates `new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] })`, calls `.start()`, and exports that SDK as `otelSdk` plus `langfuse = new LangfuseClient()`.

Convert each eval file, keeping its filename:

- `evalite(name, { data, task, scorers })` becomes a top-level `const result = await langfuse.experiment.run({ name, data, task, evaluators, maxConcurrency: 5 })`, followed by `console.log(await result.format({ includeItemResults: true }))`. Keep `data` and `evaluators` in variables. Evalite's default concurrency was 5; Langfuse's is higher.
- `data` must be an array. If it was a function, call it and await it first, or lift out the literal if that's all it returns. Rename `expected` to `expectedOutput`.
- `task` now receives the whole item, not the input. `async (input) =>` becomes `async (item) =>`, reading `item.input`. `item.input` is typed `unknown`, so cast it to the original input type.
- An inline scorer `{ name, scorer: ({ input, output, expected }) => number }` becomes `async ({ input, output, expectedOutput }) => ({ name, value })`. It must be async, because the runner calls `.then` on the result.
- `createScorer<TInput, TOutput, TExpected>({ name, scorer })` becomes an exported async function typed `Evaluator<TInput, TExpected>`. Use `import type` for Langfuse's types. `{ score, metadata }` becomes `{ name, value: score, comment, metadata }`: a string `metadata` goes in `comment`, anything else stays in `metadata`.
- Autoevals scorers: wrap with `createEvaluatorFromAutoevals` from `@langfuse/client`. Pass the scorer uncalled (`Factuality`, not `Factuality()`). It only forwards input, output and expected, so call the scorer inside your own evaluator if it needs per-item values such as `context`.
- Built-in `evalite/scorers`: use the autoevals scorer for `exactMatch` (`ExactMatch`), `levenshtein` (`Levenshtein`), `answerCorrectness` (`AnswerCorrectness`), `answerRelevancy` (`AnswerRelevancy`), `answerSimilarity` (`AnswerSimilarity`), `contextRecall` (`ContextRecall`) and `faithfulness` (`Faithfulness`). Check its arguments and model setup, and tell me that scores may not match Evalite's. Write `contains` by hand. `noiseSensitivity` and `toolCallAccuracy` have no equivalent, so stop and ask me.
- `evalite.each(variants)(name, opts)`: loop over the variants and call `langfuse.experiment.run` once per variant, with a distinct `runName` and the variant in `metadata`. The task closes over the variant.
- `wrapAISDKModel`: remove it. Its caching has no replacement, so tell me.
- AI SDK tracing, on AI SDK 6 or below: add `experimental_telemetry: { isEnabled: true }` to the AI SDK calls inside `task`. If a call sends files or images, also set `recordInputs: false`, or the file bytes go into the trace. On AI SDK 7: add `@langfuse/vercel-ai-sdk` and call `registerTelemetry(new LangfuseVercelAiSdkIntegration())` (`registerTelemetry` is from `ai`) in the setup module.
- `reportTrace`: use `startActiveObservation` from `@langfuse/tracing`.
- `EvaliteFile`: the closest match is `LangfuseMedia` from `@langfuse/core`. Tell me if you use it, because it isn't a direct replacement.

Replace the runner:

- Replace `runEvalite` and the `evalite` CLI with a script, reusing the existing entry file if there is one. It does `await import()` on each eval file in turn, listed explicitly, inside `try`, then `await otelSdk.shutdown()` in `finally`. Without the shutdown, traces are lost. Tell me new eval files must be added to this list by hand.
- Run the script with `tsx --env-file=.env`, because Evalite's env setup no longer applies.
- Add `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_BASE_URL` to `.env.example` if the project has one. The base URL defaults to Langfuse's EU cloud. Other regions and self-hosted servers must set it.
- The runner logs failed tasks and failed evaluators, then carries on and exits 0. After each run, set `process.exitCode = 1` if `result.itemResults.length !== data.length`, or if any item's `evaluations.length` is lower than `evaluators.length`.
- If the project used `scoreThreshold`: average the scores from `result.itemResults` and set `process.exitCode = 1` if the average is too low. Evalite's threshold was 0-100 and scores are 0-1.

When you're done:

- Remove `evalite`, `evalite.config.*` and the related scripts only once nothing imports Evalite.
- Run the project's typecheck on the changed files. If it has no typecheck script, run `tsc --noEmit` on them. Evaluators receive `output` typed `any`, so read each one against the original: a passing typecheck won't catch a wrong field.
- Say plainly if you have not run this against a Langfuse server.
- List any docs or readmes that still describe Evalite, without rewriting them.
- List what this project used that has no equivalent: `only`, `evalite.skip`, `trialCount`, `columns`, watch mode, `evalite export`, the model cache, and the zero-config local UI.
```

![Evalite: the TypeScript-native, local-first tool for testing LLM-powered apps.](https://raw.githubusercontent.com/mattpocock/evalite/refs/heads/main/repo-card.jpg)

- [View the docs](https://www.evalite.dev/)

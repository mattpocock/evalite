![Evaluhealth: the TypeScript-native, local-first tool for testing LLM-powered apps.](https://raw.githubusercontent.com/kernelius-hq/evaluhealth/refs/heads/main/repo-card.jpg)

## What Is Evaluhealth?

- Fully open source: **No API Key required**.
- Local-first: runs on your machine, your data never leaves your laptop.
- Based on [Vitest](https://vitest.dev/), the best TypeScript test runner around.
- Terminal UI for quick prototyping.
- Supports tracing and custom scorers.

## How Do I Learn More?

- [Read the Docs](https://www.evalu.health/)
- [Join the Discord](https://www.kernelius.com/ai-discord)

## Evaluhealth Is Experimental

Evaluhealth is still an experimental project. I'm actively working on it, and for now am pushing breaking changes.

If you run into any unexpected behavior:

1. Delete the `node_modules/.evaluhealth` folder.
2. Update `evaluhealth` to the latest version.
3. Rerun your evals.

If, after that, you run into unexpected behavior, [report an issue](https://github.com/kernelius-hq/evaluhealth/issues).

## Guides

### Watch Mode

You can run Evaluhealth in watch mode by running `evaluhealth watch`:

```bash
evaluhealth watch
```

This will watch for changes to your `.eval.ts` files and re-run the evals when they change.

> [!IMPORTANT]
>
> I strongly recommend implementing a caching layer in your LLM calls when using watch mode. This will keep your evals running fast and avoid burning through your API credits.

### Running Specific Files

You can run specific files by passing them as arguments:

```bash
evaluhealth my-eval.eval.ts
```

This also works for `watch` mode:

```bash
evaluhealth watch my-eval.eval.ts
```

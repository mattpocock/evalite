![Evaluhealth: the TypeScript-native, local-first tool for testing LLM-powered apps.](https://raw.githubusercontent.com/kernelius-hq/evaluhealth/refs/heads/main/repo-card.jpg)

## What Is Evaluhealth?

**Evaluhealth** is a fork of [Evalite](https://github.com/mattpocock/evalite) specifically designed for **healthcare and life sciences** applications. It's a TypeScript-native, local-first evaluation framework for testing LLM-powered healthcare applications, medical AI systems, and life science research tools.

### Core Features

- Fully open source: **No API Key required**.
- Local-first: runs on your machine, your data never leaves your laptop.
- Based on [Vitest](https://vitest.dev/), the best TypeScript test runner around.
- Terminal UI for quick prototyping.
- Supports tracing and custom scorers.

### Healthcare & Life Sciences Focus

Evaluhealth is tailored for developers and researchers working in healthcare and life sciences:

- **Medical AI Evaluation**: Test clinical decision support systems, diagnostic tools, and medical chatbots with comprehensive evaluation metrics
- **Life Sciences Research**: Evaluate LLM performance on scientific literature analysis, drug discovery pipelines, and biomedical data processing
- **HIPAA-Compliant Testing**: Local-first architecture ensures sensitive healthcare data (PHI) never leaves your secure environment
- **Regulatory Readiness**: Build evaluation frameworks that support FDA submissions, CE marking, and other regulatory compliance requirements
- **Clinical Validation**: Create robust test suites for validating AI models in real-world healthcare contexts with domain-specific scorers

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

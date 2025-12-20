![Evaluhealth: the TypeScript-native, local-first tool for testing LLM-powered apps.](https://raw.githubusercontent.com/kernelius-hq/evaluhealth/refs/heads/main/repo-card.jpg)

**Evaluhealth** is a fork of [Evalite](https://github.com/mattpocock/evalite) specifically tailored for **healthcare and life sciences** applications. Built with TypeScript and Vitest, it provides a local-first evaluation framework for testing LLM-powered healthcare applications, medical AI systems, and life science research tools.

> **By [Kernelius](https://kernelius.com)** — Building AI tools for healthcare and life sciences.

## Healthcare & Life Sciences Focus

Evaluhealth is designed to help developers and researchers in healthcare and life sciences:

- **Medical AI Evaluation**: Test clinical decision support systems, diagnostic tools, and medical chatbots
- **Life Sciences Research**: Evaluate LLM performance on scientific literature, drug discovery, and biomedical data analysis
- **HIPAA-Compliant Testing**: Local-first architecture ensures sensitive healthcare data never leaves your environment
- **Regulatory Readiness**: Comprehensive evaluation framework to support FDA submissions and regulatory compliance
- **Clinical Validation**: Build robust test suites for validating AI models in healthcare contexts

- [View the docs](https://www.evalu.health/)
- [Join the Discord](https://www.kernelius.com/ai-discord)

## Contributing

1. Create a .env file inside `packages/example` containing an `OPENAI_API_KEY`:

```sh
OPENAI_API_KEY=your-api-key
```

2. Run development commands:

```bash
pnpm run dev          # Build, then run tsc -w on evaluhealth + vitest on evaluhealth-tests
pnpm run example      # Build, then run evaluhealth watch + UI dev server at http://localhost:5173
pnpm run test         # Build and run all tests
```

> [!IMPORTANT]
>
> You may need to run `pnpm build` in root, then `npm link` inside `packages/evaluhealth` to get the global `evaluhealth` command to work.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full documentation.

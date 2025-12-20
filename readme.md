![Evaluhealth: the TypeScript-native, local-first tool for testing LLM-powered apps.](https://raw.githubusercontent.com/kernelius-hq/evaluhealth/refs/heads/main/repo-card.jpg)

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

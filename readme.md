![Evalite: the TypeScript-native, local-first tool for testing LLM-powered apps.](https://raw.githubusercontent.com/mattpocock/evalite/refs/heads/main/repo-card.jpg)

- [View the docs](https://www.evalite.dev/)
- [Join the Discord](https://www.mattpocock.com/ai-discord)

## Contributing

1. Create a .env file inside `packages/example` containing an `OPENAI_API_KEY`:

```sh
OPENAI_API_KEY=your-api-key
```

2. Run development commands:

```bash
pnpm run dev          # Build, then run tsc -w on evalite + vitest on evalite-tests
pnpm run example      # Build, then run evalite watch + UI dev server at http://localhost:5173
pnpm run test         # Build and run all tests
```

> [!IMPORTANT]
>
> You may need to run `pnpm build` in root, then `npm link` inside `packages/evalite` to get the global `evalite` command to work.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full documentation.

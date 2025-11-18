# @evalite/braintrust

Braintrust storage backend for Evalite. Store your evaluation results in [Braintrust](https://www.braintrust.dev) and view them in the Braintrust web UI.

## Installation

```bash
npm install @evalite/braintrust evalite
# or
pnpm add @evalite/braintrust evalite
# or
yarn add @evalite/braintrust evalite
```

## Usage

Configure Evalite to use Braintrust storage in your `evalite.config.ts`:

```typescript
import { defineConfig } from "evalite/config";
import { createBraintrustStorage } from "@evalite/braintrust";

export default defineConfig({
  storage: async () => {
    return await createBraintrustStorage({
      // Required: Your Braintrust project name
      projectName: "My Evalite Project",

      // Optional: Custom experiment name (defaults to timestamp)
      experimentName: "my-experiment",

      // Optional: API key (defaults to BRAINTRUST_API_KEY env var)
      apiKey: process.env.BRAINTRUST_API_KEY,

      // Optional: Custom Braintrust app URL
      appUrl: "https://www.braintrust.dev",
    });
  },
});
```

## Environment Variables

Set your Braintrust API key:

```bash
export BRAINTRUST_API_KEY="your-api-key-here"
```

## Features

- **Automatic URL generation**: After running evals, you'll see a URL to view results in Braintrust
- **Nested traces**: LLM calls and traces are logged as nested spans in Braintrust
- **Scores and metadata**: All scorers and custom columns are preserved
- **Experiment organization**: Results are organized by project and experiment name

## Example

See the [examples directory](./examples) for a complete working example.

To run the example:

```bash
cd examples
export BRAINTRUST_API_KEY="your-api-key"
pnpm evalite run simple.eval.ts
```

## API Reference

### `createBraintrustStorage(options)`

Creates a new Braintrust storage backend.

**Options:**

- `projectName` (string, required): The Braintrust project name
- `experimentName` (string, optional): Custom experiment name. Defaults to `evalite-{timestamp}`
- `apiKey` (string, optional): Braintrust API key. Defaults to `BRAINTRUST_API_KEY` env var
- `appUrl` (string, optional): Custom Braintrust app URL. Defaults to `https://www.braintrust.dev`

**Returns:** `Promise<BraintrustStorage>`

## How It Works

When you run evals with Braintrust storage:

1. Each eval suite creates a Braintrust experiment
2. Each test case becomes a top-level span (row) in the experiment
3. Scores are logged to their corresponding spans
4. LLM traces are logged as nested spans under their test case
5. After the run completes, you get a URL to view results in Braintrust

## License

MIT

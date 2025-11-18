# Braintrust Storage Example

This example demonstrates how to use `@evalite/braintrust` to store evaluation results in Braintrust.

## Prerequisites

1. Get a Braintrust API key from [braintrust.dev](https://www.braintrust.dev)
2. Set your API key as an environment variable:
   ```bash
   export BRAINTRUST_API_KEY="your-api-key-here"
   ```

## Setup

1. Build the required packages (from the monorepo root):

   ```bash
   cd /path/to/evalite
   pnpm build
   ```

2. Set your Braintrust API key:
   ```bash
   export BRAINTRUST_API_KEY="your-api-key-here"
   ```

## Running the Example

From the monorepo root:

```bash
# Navigate to the examples directory
cd packages/braintrust/examples

# Run the example once
../../../packages/evalite/dist/bin.js run simple.eval.ts

# Or use the evalite command if you have it installed globally
evalite run simple.eval.ts
```

Or from anywhere in the monorepo with pnpm:

```bash
pnpm --filter evalite exec evalite run packages/braintrust/examples/simple.eval.ts
```

## What to Expect

When you run the example **with a valid API key**, you should see:

1. The eval running and completing (3 test cases)
2. All tests passing with 100% score
3. A message with a Braintrust URL:
   ```
   View results in Braintrust: https://www.braintrust.dev/app/...
   ```
4. Click the URL to view your results in the Braintrust web UI!

**Without an API key**, the eval will still run locally and show results, but:

- You'll see errors about missing `BRAINTRUST_API_KEY` in stderr
- Results won't be uploaded to Braintrust
- No URL will be displayed (or it may 404)

## What's Happening

The example:

- Uses `createBraintrustStorage()` in `evalite.config.ts` to configure Braintrust storage
- Runs a simple eval that tests string concatenation
- Sends results (inputs, outputs, scores, traces) to Braintrust
- Generates a URL where you can view and analyze the results

## Files

- `simple.eval.ts` - A simple evaluation to test the storage integration
- `evalite.config.ts` - Configuration that enables Braintrust storage
- `package.json` - Dependencies for running the example

## Customization

You can customize the Braintrust configuration in `evalite.config.ts`:

```typescript
await createBraintrustStorage({
  projectName: "My Project Name", // Required
  experimentName: "my-experiment", // Optional (defaults to timestamp)
  apiKey: "your-api-key", // Optional (defaults to env var)
  appUrl: "https://www.braintrust.dev", // Optional (custom instance)
});
```

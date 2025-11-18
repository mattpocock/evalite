import { defineConfig } from "evalite/config";
import { createBraintrustStorage } from "@evalite/braintrust";

/**
 * Example configuration for using Braintrust as the storage backend.
 *
 * To use this configuration:
 * 1. Install the Braintrust package: `pnpm add @evalite/braintrust`
 * 2. Rename this file to `evalite.config.ts` (or use --config flag)
 * 3. Set the BRAINTRUST_API_KEY environment variable
 * 4. Run evalite as normal
 *
 * Your evaluation results will be stored in Braintrust and you'll
 * receive a URL to view them in the Braintrust web UI.
 */
export default defineConfig({
  storage: async () => {
    return await createBraintrustStorage({
      // Required: Your Braintrust project name
      projectName: "Evalite Example Project",

      // Optional: Specific experiment name
      // If not provided, a timestamp will be used
      experimentName: `evalite-run-${new Date().toISOString().split("T")[0]}`,

      // Optional: API key (defaults to BRAINTRUST_API_KEY env var)
      // apiKey: process.env.BRAINTRUST_API_KEY,

      // Optional: Custom Braintrust API URL
      // baseUrl: "https://api.braintrust.dev",
    });
  },

  // Other Evalite configuration options work as normal
  scoreThreshold: 80,
  testTimeout: 30000,
  maxConcurrency: 5,
});

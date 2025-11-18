import { defineConfig } from "evalite/config";
import { createBraintrustStorage } from "../dist/index.js";

/**
 * Example Evalite configuration using Braintrust storage.
 *
 * To use this:
 * 1. Set BRAINTRUST_API_KEY environment variable
 * 2. Run: evalite run simple.eval.ts
 * 3. Click the Braintrust URL in the output to view results
 */
export default defineConfig({
  storage: async () => {
    return await createBraintrustStorage({
      // Required: Your Braintrust project name
      projectName: "@evalite/braintrust Example",

      // Optional: Custom experiment name (defaults to timestamp)
      experimentName: `example-run-${new Date().toISOString().split("T")[0]}`,

      // Optional: API key (defaults to BRAINTRUST_API_KEY env var)
      // apiKey: process.env.BRAINTRUST_API_KEY,

      // Optional: Custom Braintrust app URL
      // appUrl: "https://www.braintrust.dev",
    });
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 5000, // Should be overridden by evaluhealth.config.ts (60000)
    maxConcurrency: 2, // Should be overridden by evaluhealth.config.ts (10)
  },
});

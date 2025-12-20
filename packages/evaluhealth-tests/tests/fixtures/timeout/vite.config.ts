import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 10, // Use a short timeout to force a timeout
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    maxConcurrency: process.env.CI ? 1 : 5,
  },
});

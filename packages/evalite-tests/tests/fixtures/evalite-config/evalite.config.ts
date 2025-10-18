import { defineConfig } from "evalite/config";

export default defineConfig({
  hideTable: true,
  server: {
    port: 3007,
  },
  testTimeout: 60000,
  maxConcurrency: 10,
});

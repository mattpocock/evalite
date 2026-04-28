import { defineConfig } from "evalite/config";

export default defineConfig({
  viteConfig: {
    test: {
      // @ts-expect-error - This should be invalid
      testTimeout: 5000,
    },
  },
});

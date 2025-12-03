---
"evalite": major
---

Removed implicit reading of vitest.config.ts/vite.config.ts files. Users must now explicitly pass Vite config via evalite.config.ts using the new `viteConfig` option. This change makes configuration more explicit and less confusing.

**Migration Guide:**

Before:

```ts
// vitest.config.ts was automatically read
export default defineConfig({
  test: {
    testTimeout: 60000,
  },
});
```

After:

```ts
// evalite.config.ts
import { defineConfig } from "evalite/config";
import viteConfig from "./vite.config.ts";

export default defineConfig({
  viteConfig: viteConfig,
  // Note: testTimeout, maxConcurrency, and setupFiles
  // must be at root level, not in viteConfig.test
  testTimeout: 60000,
  setupFiles: ["./setup.ts"],
});
```

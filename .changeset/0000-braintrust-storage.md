---
"evalite": minor
"@evalite/braintrust": major
---

**Breaking Change:** Braintrust storage has been moved to a separate package `@evalite/braintrust`. This reduces the bundle size of the main `evalite` package for users who don't need Braintrust integration.

**What changed:**

- Braintrust storage is now in a separate package `@evalite/braintrust`
- The main `evalite` package no longer includes the `braintrust` dependency
- The `evalite/braintrust-storage` export has been removed

**Migration:**
If you were using Braintrust storage:

1. Install the new package: `pnpm add @evalite/braintrust` (or `npm install @evalite/braintrust`)
2. Update your imports in `evalite.config.ts`:
   - **Before:** `import { createBraintrustStorage } from "evalite/braintrust-storage";`
   - **After:** `import { createBraintrustStorage } from "@evalite/braintrust";`
3. The API remains unchanged - only the import path has changed

**Benefits:**

- Main `evalite` package is lighter and faster to install
- Braintrust dependency only installed when needed
- Better separation of concerns

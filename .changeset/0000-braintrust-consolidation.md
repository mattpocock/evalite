---
"evalite": minor
---

Added Braintrust storage integration to the main `evalite` package.

**What's new:**

- Braintrust storage is now available as a subpath export: `evalite/braintrust`
- `braintrust` is an optional peer dependency (similar to the AI SDK integration pattern)
- Use `createBraintrustStorage()` to store eval results in Braintrust for tracking and visualization

**Usage:**

1. Install `braintrust` as a peer dependency: `pnpm add braintrust`
2. Import in your `evalite.config.ts`:

   ```ts
   import { createBraintrustStorage } from "evalite/braintrust";

   export default {
     storage: createBraintrustStorage({
       projectName: "my-project",
       apiKey: process.env.BRAINTRUST_API_KEY,
     }),
   };
   ```

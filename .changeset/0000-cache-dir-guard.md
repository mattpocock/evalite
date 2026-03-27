---
"evalite": patch
---

Fix: Only create cache directory when `cacheEnabled` is true. Previously, the `node_modules/.evalite/files` directory was created unconditionally at startup, before the `cacheEnabled` setting was resolved.

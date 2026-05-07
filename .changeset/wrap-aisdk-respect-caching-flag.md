---
"evalite": patch
---

Fix: `wrapAISDKModel(model, { caching: false })` is now actually respected. Previously the local `caching: false` flag was silently ignored as long as tracing was enabled — the cache was still being read from and written to. The wrapper now skips both cache fetch and store (in `wrapGenerate` and `wrapStream`) when `caching: false` is set.

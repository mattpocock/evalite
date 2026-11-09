---
"evalite": patch
---

Handle `reasoning` content type in `wrapAISDKModel` instead of throwing an error. This fixes a crash when using AI SDK v5+ with thinking models (e.g., Anthropic Claude with extended thinking) that include `reasoning` parts in assistant messages.

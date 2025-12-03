---
"evalite": minor
---

Removed streaming text support from tasks. Process streams before returning from task() (e.g., await result.text for AI SDK).

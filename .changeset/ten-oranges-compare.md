---
"evalite": minor
---

Added `--threshold`, for setting a score threshold for evals. This is useful for running on CI. If the score threshold is not met, it will fail the process.

```bash
evalite --threshold=50 # Score must be greater than or equal to 50

evalite watch --threshold=70 # Also works in watch mode
```

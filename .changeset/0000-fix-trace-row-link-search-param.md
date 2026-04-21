---
"evalite": patch
---

Fix: clicking a trace row in the eval detail view now navigates to the per-trace panel. Previously the row's `Link` omitted `search: { trace }`, so the URL never changed and the right panel stayed on the eval-level view. Users had to manually append `?trace=N` to the URL as a workaround.

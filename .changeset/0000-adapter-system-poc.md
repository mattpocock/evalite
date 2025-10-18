---
"evalite": minor
---

Storage system for pluggable storage backends (Phase 1 POC). Introduced `EvaliteStorage` interface allowing custom storage implementations (e.g. Postgres, Turso, in-memory). SQLite remains default backend with no API changes for existing users.

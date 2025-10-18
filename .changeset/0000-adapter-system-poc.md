---
"evalite": minor
---

Storage system for pluggable storage backend. Introduced `Evalite.Storage` interface allowing custom storage implementations (e.g. Postgres, Turso, in-memory). SQLite remains default backend with no API changes for existing users.

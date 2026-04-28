The `v1` branch is currently the main development branch. Once we ship v1, it'll go to `main` instead.

For user-facing changes, add a changeset to `.changeset`. Check all changesets there first to see if there are duplicates. We use `@changesets/cli`, but you can create/edit the file manually. Use `evalite` for the name.

Evalite's UI is in apps/evalite-ui.
The docs are in apps/evalite-docs.
The core is in packages/evalite.

Check out CONTEXT.md for a reference on nomenclature used in the repo.

## Agent skills

### Issue tracker

GitHub Issues on `mattpocock/evalite` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

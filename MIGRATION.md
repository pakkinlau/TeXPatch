Migration Guide: Monorepo + Workspace

Overview
- The repository moved from a single-package layout (`TeXPatch-core/`) to an npm workspaces monorepo with:
  - Core: `packages/core` (package name: `texpatch-core`)
  - Extension: `packages/extension` (private; not published to npm)

What changed
- Paths and commands:
  - Build core: `npm -w texpatch-core run build`
  - Run goldens: `npm -w texpatch-core run golden`
  - Idempotence: `npm -w texpatch-core run idempotence`
  - Profiles sanity: `npm -w texpatch-core run profiles`
  - Build extension: `npm -w texpatch-extension run build`
- Aggregated checks: `make test` and `make quality` (typecheck, goldens, idempotence, size budgets)
- CLI (local dev): `node packages/core/dist/bin/texpatch.js --profile katex < in.md > out.md`
- Dist reproducibility: `bash scripts/check-dist-clean.sh`

What did not change
- Package name and public API remain the same: `import { convert, detect, profiles } from 'texpatch-core'`.
- Tests and goldens behavior unchanged; pipeline remains idempotent.

CI
- CI now installs workspaces, builds core via workspace commands, runs goldens/idempotence, then builds the extension and checks dist reproducibility and size budgets.

Releases
- Core is published to npm when a GitHub Release is published (see `.github/workflows/publish.yml`).
- The extension builds and is uploaded as a zip artifact (not published to npm).

Notes
- Replace README badge placeholders (`OWNER/REPO`) after pushing to GitHub.
- Provide a contact address in `CODE_OF_CONDUCT.md`.


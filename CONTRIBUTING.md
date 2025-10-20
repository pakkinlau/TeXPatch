Contributing Guide

Thank you for helping improve TeXPatch! This project aims to be small, deterministic, and idempotent.

Getting started
- Node >= 20, TypeScript >= 5
- Install: `npm i`
- Run all checks: `make test`

Core development
- Add small, ordered transforms; keep idempotence (convert(convert(x)) === convert(x)).
- Guardrails: do not modify fenced code, inline code, links/images, or already present `$$…$$`.
- Add or update goldens under `tests/golden/`; update expected outputs accordingly.
- Validate locally via `make test` (goldens, idempotence, CLI e2e, dist reproducibility).

Commit & PRs
- Keep PRs focused. If adding new rules, include tests (goldens) and minimal docs.
- Fill out the PR template and link related issues.

Releases
- Core is published to npm on GitHub Release. Ensure `NPM_TOKEN` is available in repo secrets.
- Optionally use Changesets to propose version bumps; CI can open a release PR.

Code of Conduct
- See CODE_OF_CONDUCT.md. Be courteous and collaborative.


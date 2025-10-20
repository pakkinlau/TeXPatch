TeXPatch — Patch TeX quirks in Markdown (Monorepo)

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](#)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)

Note: replace OWNER/REPO in the CI badge URL with your GitHub repo path.

Overview
- Monorepo hosting the reusable core library and a Chrome extension.
- Core is idempotent, deterministic, no network, and respects fenced/inline code and links/images.
- The Chrome extension consumes the published core; this repo builds an artifact zip for convenience.

Packages
- Core: `packages/core` (TS library + CLI `texpatch`)
- Extension: `packages/extension` (MV3, private; bundles `texpatch-core`)
- Tools: `tools/` Python reference (parity) and a stdin→stdout wrapper

Install (local dev)
- cd `TeXPatch-core` && `npm i` && `npm run build`

Local clipboard
- Convert clipboard in place: `node packages/clip/bin/texpatch-clip.mjs --profile katex`
- Optional: `--echo` to also print to stdout

CLI
- Local dev: `node packages/core/dist/bin/texpatch.js --profile katex < in.md > out.md`
- After publish: `npx texpatch --profile katex < in.md > out.md`
- Profiles: `katex` (default), `pandoc`, `github`
- Flags: `--strip-final-newline` to remove a trailing final newline for exact file parity when needed

Chrome Extension (MV3)
- Build: `npm -w texpatch-extension run build`
- Load unpacked: Chrome → Extensions → Developer mode → Load unpacked → select `packages/extension`
- Use:
  - Mode 1 (manual): Select text on any page → open the popup → click “Convert selection → clipboard”.
  - Mode 2 (auto, default): Keep “Auto‑convert on copy” enabled → press Ctrl/Cmd+C on any page → clipboard gets converted text automatically.
  - Choose a Profile; it persists via `chrome.storage.sync`.
- Permissions: `activeTab`, `scripting`, `storage`, `clipboardWrite`. See `PRIVACY.md`.
- Packaging (zip artifact): `bash scripts/pack-extension.sh` (uses core version or `EXT_VERSION` env).

TypeScript API (ESM)
```ts
// from a consumer project
import { convert, detect, profiles } from 'texpatch-core';
const out = convert(src, { profile: 'katex' });
const diag = detect(src); // [{ id:'underscore-in-text', count:3, spans:[...] }]
```

Profiles
- `katex` (default): full pipeline R1–R7
- `pandoc`: R1, R2, R5, R6 (skip some star-forms and split-suffix)
- `github`: minimal R1; display $$…$$ is fenced as ```latex … ```

Rules
- R1 Escape underscores in textish macros
- R2 Set glyph braces after := or =
- R3 Indicator braces after \mathbb{1}/\mathbf{1}/\mathds{1}
- R4 Star forms → operatorname*/subscripts
- R5 Big delimiters \Big{…}/\big{…} → \Big\{…\}/\big\{…\}
- R6 Right-delimiter fixes (\right= → \right) =, etc.)
- R7 Merge split suffix ('$z$^2' → '$z^2$')

Tests & Quality Gates
- Goldens: `npm -w texpatch-core run golden`
- Idempotence: `npm -w texpatch-core run idempotence`
- Profiles sanity: `npm -w texpatch-core run profiles`
- CLI e2e: `bash tests/cli.e2e.sh`
- Dist reproducibility: `bash scripts/check-dist-clean.sh`
- All-in-one: `bash scripts/test-all.sh` or `make test`

Releases
- Core: published to npm on GitHub Release via workflow. Requires `NPM_TOKEN` secret.
- Extension: workflow uploads a version-stamped zip artifact (not published to npm). Icons from `packages/extension/assets/icons/` are included if present.

Contributing
- Keep transforms small and ordered; maintain idempotence.
- Add goldens under `tests/golden/` for regressions.
- Avoid touching fenced/inline code, links/images, and already-formed `$$...$$`.

Privacy
- See `PRIVACY.md`. TeXPatch operates locally; the extension reads selection only on user action, writes the result to your clipboard, and stores only your profile preference.

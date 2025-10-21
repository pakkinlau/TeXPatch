# TeXPatch — TeX/LaTeX fixes for Markdown (KaTeX/MathJax)

> A TypeScript core library, CLI, and Chrome extension that patches TeX/LaTeX quirks in Markdown for KaTeX/MathJax renderers (Obsidian, Quarto, GitHub Pages).

[![CI](https://github.com/pakkinlau/TeXPatch/actions/workflows/ci.yml/badge.svg)](https://github.com/pakkinlau/TeXPatch/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-checked-informational)

**Why TeXPatch?**
- Keeps code fences/links intact; only touches mathy fragments.
- Idempotent transforms (safe to run multiple times).
- Fixes common pain points: `|x|` → `\\lvert x\\rvert`, outer `\\{\\}` escaping, etc.

Overview
- Monorepo hosting the reusable core library, a clipboard tool, and a Chrome extension.
- Core is idempotent, deterministic, no network, and respects fenced/inline code and links/images.
- The Chrome extension consumes the published core; this repo builds an artifact zip for convenience.

Packages
- Core: `packages/core` (TS library + CLI `texpatch`)
- Extension: `packages/extension` (MV3, private; bundles `texpatch-core`)
- Clipboard tool: `packages/clip` (reads → converts → writes clipboard)
- Tools: `tools/` Python reference (parity) and a stdin→stdout wrapper

Install (local dev)
- From repo root: `npm i`
- Build core: `npm -w texpatch-core run build`
- Build extension: `npm -w texpatch-extension run build`
  - Windows tip: build from a Windows terminal (not WSL) so esbuild targets win32-x64.

Local clipboard
- Convert clipboard in place (prints stats): `npm run clip -- --source openai --profile katex`
- Flags: `--echo` to print converted text; `--json` for machine-readable stats

CLI
- Local dev: `node packages/core/dist/bin/texpatch.js --profile katex < in.md > out.md`
- After publish: `npx texpatch --profile katex < in.md > out.md`
- Profiles: `katex`/`mathjax` (default), `pandoc`, `github`
- Flags: `--strip-final-newline` to remove a trailing final newline for exact file parity when needed

Chrome Extension (MV3)
- Build: `npm -w texpatch-extension run build`
- Load unpacked: Chrome → Extensions → Developer mode → Load unpacked → select `packages/extension`
- Use:
  - Convert clipboard: Open the popup → click “Convert clipboard”.
  - For selected text: right‑click → “Copy converted” or press Alt+Shift+C.
  - Format: choose From (who generated it) and To (where you’ll paste). Choices persist.
  - Manual preview (optional): open by default; paste to see live output.
- Permissions: `activeTab`, `scripting`, `storage`, `clipboardWrite`. See `PRIVACY.md`.
- Packaging (zip artifact): `bash scripts/pack-extension.sh` (uses core version or `EXT_VERSION` env).
 - Icons: place PNGs under `packages/extension/assets/icons/`. This repo includes a default icon wired via the manifest; you can replace
   `icon-16.png`, `icon-48.png`, `icon-128.png`, `icon-512.png` with your own.

TypeScript API (ESM)
```ts
// from a consumer project
import { convert, detect, profiles } from 'texpatch-core';
const out = convert(src, { profile: 'katex' }); // 'mathjax' is an alias of 'katex'
const diag = detect(src); // [{ id:'underscore-in-text', count:3, spans:[...] }]
```

Profiles
- `katex` / `mathjax` (default): full pipeline R1–R7 (safe for KaTeX/MathJax)
- `pandoc`: R1, R2, R5, R6 (skip some star-forms and split-suffix)
- `github`: minimal R1; display $$…$$ is fenced as ```latex … ```

Format mapping (To → profile)
- Obsidian (MathJax) → `katex`/`mathjax`
- Quarto HTML (MathJax) → `katex`/`mathjax`
- Quarto/Pandoc PDF (LaTeX) → `pandoc`
- GitHub (fence $$ as code) → `github`

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

Windows tips
- If `npm i` fails with EACCES/EPERM on node_modules/.bin, run: `npm install --no-bin-links` and use paths/scripts (`node packages/core/dist/bin/texpatch.js`, `npm run clip`).
- Build the extension from Windows (not WSL) so esbuild picks the correct native binary.

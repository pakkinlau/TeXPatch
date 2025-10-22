# TeXPatch — Agent Guide

Purpose
- TeXPatch fixes small TeX quirks in LLM‑emitted Markdown so math renders cleanly in KaTeX/MathJax. It operates on snippets and is idempotent.

Repo layout
- packages/core: TypeScript core library and CLI (`texpatch`).
  - src/index.ts exports `{ convert, detect, profiles }`.
  - src/transformer.ts orchestrates ordered passes; accepts `{ profile, source }`.
  - src/normalize.ts implements math body fixes (R1–R7).
  - src/rules/profiles.ts defines target rule sets (katex/mathjax, pandoc, github).
  - dist/ contains compiled JS used by CLI and tests.
- packages/extension: Chrome MV3 extension that bundles the core.
  - popup.html / src/popup.ts: UI. Clipboard convert button; “Format” selectors From/To; stats line; manual preview.
  - src/content.ts: selection helpers; clipboard write fallback.
  - src/background.ts: context menu + keyboard shortcut wiring.
  - manifest.json: permissions, icons, popup, background.
- packages/clip: Clipboard tool (Node) that reads→converts→writes clipboard; prints stats.
- tests/golden: before/after fixtures (G0–G17). Keep idempotence intact.
- scripts/: CI helpers; size and dist reproducibility checks.

Build & test (dev)
- Install: `npm i` (on Windows you may use `npm i --no-bin-links`).
- Core build: `npm --workspace packages/core run build`.
- Goldens: `npm --workspace packages/core run golden`.
- Idempotence: `npm --workspace packages/core run idempotence`.
- Extension build (Windows terminal recommended): `npm -w texpatch-extension run build`.

CLI entry points
- Core CLI: `node packages/core/dist/bin/texpatch.js --profile katex < in.md > out.md`.
- Clipboard CLI: `npm run clip -- --source openai --profile katex` (use `--echo` to print).

Chrome extension (unpacked)
- Load: Chrome → Extensions → Developer mode → Load unpacked → `packages/extension`.
- Use: “Convert clipboard”, context menu “Copy converted”, or Alt+Shift+C.

Invariants
- Never modify fenced code blocks, inline code, links/images, or content inside existing `$$…$$`.
- Keep transforms ordered and idempotent. Applying `convert(convert(x))` must equal `convert(x)`.
- Profiles toggle rule families; `katex`/`mathjax` = full pipeline, `pandoc` = conservative subset, `github` = fence display math.

Extending formats
- Targets (outputs): add a profile or alias in `src/rules/profiles.ts`. For web targets like GitHub, gate special handling (e.g., fence display math) in the transformer.
- Sources (inputs): use `ConvertOptions.source` and add a safe pre‑pass in the transformer (no‑op by default).
- Keep changes covered by new goldens; don’t break existing fixtures or idempotence.

CI expectations
- Goldens and idempotence must pass.
- Core `dist` should be reproducible (scripts/check-dist-clean.sh).
- Extension builds via esbuild; build from the host OS (Windows if testing in Chrome on Windows).

# TeXPatch

TeXPatch converts LLM-flavored Markdown math into renderer-safe Markdown for Obsidian, KaTeX, MathJax, Quarto, Pandoc, and GitHub-oriented workflows.

It is not a symbolic algebra system. It is a deterministic cleanup and validation pipeline for malformed TeX/Markdown boundaries that commonly appear in copied model output.

## Current Focus

- Convert bracket display math such as `[` ... `]`, `# [` ... `]`, and `\[` ... `\]` into explicit display math.
- Preserve code fences, inline code, and Markdown links.
- Repair common renderer failures: repeated relation separators, unescaped literal set braces, bad `\left{...\right}` delimiters, split suffixes, row spacing, and text macro underscores.
- Validate transformed files locally with real KaTeX and MathJax engines before trusting large outputs.
- Bundle the same core transformer into a Chrome MV3 extension.

## Packages

- `packages/core`: TypeScript library and CLI package `texpatch`.
- `packages/extension`: Chrome MV3 extension that bundles the core transformer.
- `packages/clip`: local clipboard helper.
- `tools`: validation and development utilities.
- `docs`: design log, validation policy, and extension release notes.

## Install

```bash
npm install
npm --workspace packages/core run build
```

## CLI

```bash
node packages/core/dist/bin/texpatch.js --profile katex < input.md > output.md
```

Profiles:

- `katex`: default strict web/Obsidian-oriented cleanup.
- `mathjax`: alias of `katex` for now; use validation gates to check MathJax compatibility.
- `pandoc`: skips rules that are too renderer-specific for LaTeX/Pandoc output.
- `github`: fences display math as `latex` code blocks.

## Validation Gates

For serious documents, do not trust transform output until it passes the gates:

```bash
npm run validate:katex -- output.md
npm run validate:mathjax -- output.md
```

The gates check for:

- leftover bracket math blocks;
- bare TeX commands outside math spans;
- malformed standalone equality separators;
- KaTeX parse failures;
- MathJax error nodes.

KaTeX is stricter and catches many syntax errors early. MathJax is closer to Obsidian's rendering family and catches compatibility failures that appear as MathJax error nodes. Use both for high-value documents.

## Chrome Extension

Build:

```bash
npm run build:ext
```

Load unpacked:

1. Open Chrome Extensions.
2. Enable Developer mode.
3. Load `packages/extension`.

Package:

```bash
EXT_VERSION=v0.1.1 bash scripts/pack-extension.sh
```

The extension uses the same core rules as the CLI. It should remain a thin UI over tested deterministic rules; rule discovery and corpus validation should happen in the repo, not inside the extension.

## Development Loop

Recommended workflow for a new failure:

```bash
node packages/core/dist/bin/texpatch.js < sample.in.md > /tmp/sample.out.md
npm run validate:katex -- /tmp/sample.out.md
npm run validate:mathjax -- /tmp/sample.out.md
```

Then add a focused golden fixture under `tests/golden/` and update the transformer only as narrowly as the failure requires.

Core checks:

```bash
npm --workspace packages/core run golden
npm --workspace packages/core run idempotence
npm --workspace packages/core run profiles
npm run typecheck
npm run build:ext
```

## Release

- Core release is handled through GitHub releases and npm publishing.
- Extension release builds a version-stamped zip artifact; Chrome Web Store submission is manual.
- See [docs/extension.md](docs/extension.md) for the extension workflow.

## Design Notes

- [docs/design-log.md](docs/design-log.md)
- [docs/validation-gates.md](docs/validation-gates.md)
- [docs/extension.md](docs/extension.md)

TeXPatch Clipboard CLI

Reads text from your system clipboard, normalizes Markdown+TeX with `texpatch-core`, and writes the result back to the clipboard.

Usage (local dev)
```
npm i
npm -w texpatch-core run build
node packages/clip/bin/texpatch-clip.mjs --profile katex
```

Options
- `--profile katex|pandoc|github` — choose the rule profile (default: katex)
- `--echo` — also print the converted text to stdout

Notes
- This package depends on `clipboardy` and `texpatch-core`. It’s kept separate so `texpatch-core` remains dependency‑light.


TeXPatch Clipboard CLI

Reads text from your system clipboard, normalizes Markdown+TeX with `texpatch-core`, and writes the result back to the clipboard.

Usage (local dev)
```
npm i
npm -w texpatch-core run build
npm run clip -- --profile katex
```

Behavior
- Reads plain text from your system clipboard, converts it with `texpatch-core`, and writes the result back to the clipboard.
- By default prints a short stats summary (not the converted text).

Options
- `--profile katex|pandoc|github` — choose the rule profile (default: katex)
- `--echo` — also print the converted text to stdout
- `--json` — output machine-readable stats JSON

Notes
- This package depends on `clipboardy` and `texpatch-core`. It’s kept separate so `texpatch-core` remains dependency‑light.

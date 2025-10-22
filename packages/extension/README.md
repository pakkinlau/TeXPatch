TeXPatch Extension (MV3)

Summary
- MV3 Chrome extension that bundles `texpatch` and provides a popup to convert the current page selection to clipboard, with an option to replace text in editable fields. Profile selection is persisted via `chrome.storage.sync`.

Build
```
npm -w texpatch-extension run build
```
Outputs bundled `dist/popup.js` and `dist/content.js` consumed by `popup.html`.

Load Unpacked
- Open Chrome → Extensions → enable Developer mode
- Load unpacked → select `packages/extension`

Usage
- Convert clipboard (one-click): Open the popup → click “Convert clipboard”.
- Select text on a page, then use:
  - Context menu: right‑click → “Copy converted”, or
  - Keyboard: Alt+Shift+C
- Choose a profile (katex/pandoc/github); it persists across sessions.

Permissions & Privacy
- Permissions: `activeTab`, `scripting`, `storage`, `clipboardWrite` (for reliable clipboard writes).
- See `PRIVACY.md` for details. No network requests are made; only the selection is read on demand, and the result is written to your clipboard.

Packaging (Zip)
```
bash scripts/pack-extension.sh
```
Produces `texpatch-extension.zip` at repo root with a stamped `manifest.json` and included icons (if present under `packages/extension/assets/icons/`).

Notes
- This package is private (not published to npm). It consumes the published `texpatch` or the local workspace during development.

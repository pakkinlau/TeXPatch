# Chrome Extension

The Chrome extension is a delivery surface for the tested core transformer.

## Build

```bash
npm run build:ext
```

The build bundles `texpatch` into:

- `packages/extension/dist/background.js`
- `packages/extension/dist/content.js`
- `packages/extension/dist/popup.js`

These generated files are ignored by git.

## Load Unpacked

1. Open Chrome Extensions.
2. Enable Developer mode.
3. Load `packages/extension`.

## Package

```bash
EXT_VERSION=v0.1.1 bash scripts/pack-extension.sh
```

This creates `texpatch-extension.zip` with a version-stamped manifest. The zip is ignored by git and is intended for release artifacts or manual Chrome Web Store upload.

## Strict Mode Direction

The extension currently performs conversion and clipboard actions. Strict validation should remain local/CLI-first until the UX is intentionally designed.

If strict mode is added to the extension later, it should:

- transform into memory;
- run lightweight structure checks;
- optionally run bundled KaTeX validation if bundle size is acceptable;
- refuse automatic copy on failure;
- show line-relative diagnostics;
- offer an explicit "copy anyway" override.

MathJax validation should stay out of the extension unless there is a clear product need. It is heavier and the local repo gate is better for corpus debugging.

## Release Workflow

The release workflow should:

1. install workspaces;
2. build the core package;
3. build the extension;
4. run the relevant gates on committed fixtures or release candidates;
5. package the zip artifact;
6. upload the artifact for manual Web Store submission.

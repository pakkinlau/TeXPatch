Release Guide

Core (texpatch)
- Manual: bump version in `packages/core/package.json`, create a GitHub Release tagged `vX.Y.Z`. The publish workflow will build and publish to npm.
- Changesets (optional): use `npx changeset` to create entries; configure the Changesets action to open a release PR. Merge and publish via GitHub Release.

Extension (packages/extension)
- Not published to npm. On Release, CI builds and uploads a zip artifact containing `manifest.json`, `popup.html`, and `dist/`.

Chrome Web Store submission (manual)
1) Prepare assets
   - Icons: PNG 16/48/128/512 at `packages/extension/assets/icons/`
   - Screenshots: place under `store/screenshots/` for safekeeping (upload via store UI)
   - Description: use `store/description.txt`
   - Privacy policy: link to `PRIVACY.md` in the repo
2) Build and package
   - `npm i && npm --workspace packages/core run build && npm -w texpatch-extension run build`
   - `EXT_VERSION=vX.Y.Z bash scripts/pack-extension.sh` (uses this version in manifest)
3) Upload
   - Upload `texpatch-extension.zip`, add descriptions/screenshots, set privacy link
   - Submit for review

Requirements
- Repository secret `NPM_TOKEN` with publish access to `texpatch`.

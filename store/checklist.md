Chrome Web Store Submission Checklist

Before you begin
- [ ] Icons (PNG): 16, 48, 128, 512 under `packages/extension/assets/icons/`
- [ ] Screenshots (PNG): 1280×800 or similar under `store/screenshots/`
- [ ] Short description (max 132 chars) and full description (see `store/description.txt`)
- [ ] Privacy policy URL (link to `PRIVACY.md` in your repo)

Build the extension
1) `npm i`
2) `npm -w texpatch-core run build`
3) `npm -w texpatch-extension run build`
4) `EXT_VERSION=v0.1.1 bash scripts/pack-extension.sh` (use your tag)

Verify the zip
- [ ] Unzip and load unpacked in Chrome → Extensions
- [ ] Popup opens, converts selection, replaces in editable when toggled
- [ ] No excessive permissions requested
- [ ] Version in `manifest.json` matches your tag

Submit
1) Upload `texpatch-extension.zip`
2) Add title, short description, long description (paste from `store/description.txt`)
3) Upload screenshots
4) Set privacy policy URL
5) Save and submit for review

Post‑publish
- [ ] Tag release in GitHub (triggers npm publish for core)
- [ ] Update README with Chrome Web Store link


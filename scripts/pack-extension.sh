#!/usr/bin/env bash
set -euo pipefail

# Package the Chrome extension into texpatch-extension.zip with an optional version stamp.

ROOT=$(cd "$(dirname "$0")/.." && pwd)
EXT_DIR="$ROOT/packages/extension"
OUT_ZIP="$ROOT/texpatch-extension.zip"

if [[ ! -d "$EXT_DIR/dist" ]]; then
  echo "Extension dist not found. Build it first (npm -w texpatch-extension run build)." >&2
  exit 2
fi

# Compute version to stamp into manifest.json
V_FROM_ENV=${EXT_VERSION:-}
if [[ -z "$V_FROM_ENV" ]]; then
  # Fallback: use core package version
  V_FROM_ENV=$(node -e "console.log(JSON.parse(require('fs').readFileSync('packages/core/package.json','utf8')).version)")
fi
# Strip leading 'v' and non-digit/dot chars for Chrome
EXT_VER=$(echo "$V_FROM_ENV" | sed -E 's/^v//' | sed -E 's/[^0-9.].*$//')
if [[ -z "$EXT_VER" ]]; then
  EXT_VER="0.0.0"
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# Prepare manifest with version stamp and optional icons if present
if [[ ! -f "$EXT_DIR/manifest.json" ]]; then
  echo "Missing manifest.json" >&2
  exit 3
fi

node - <<'NODE' "$EXT_DIR" "$WORK" "$EXT_VER"
const fs = require('fs');
const path = require('path');
const [,, extDir, workDir, version] = process.argv;
const manifest = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));
manifest.version = version;

// If icons exist, inject icons field in the stamped manifest
const iconsDir = path.join(extDir, 'assets', 'icons');
const sizes = [16, 48, 128, 512];
const icons = {};
for (const s of sizes) {
  const p = path.join(iconsDir, `icon-${s}.png`);
  if (fs.existsSync(p)) {
    icons[String(s)] = `assets/icons/icon-${s}.png`;
  }
}
if (Object.keys(icons).length) {
  manifest.icons = icons;
}

fs.mkdirSync(workDir, { recursive: true });
fs.writeFileSync(path.join(workDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.copyFileSync(path.join(extDir, 'popup.html'), path.join(workDir, 'popup.html'));

// Copy dist and assets if present
const distSrc = path.join(extDir, 'dist');
const distDst = path.join(workDir, 'dist');
fs.cpSync(distSrc, distDst, { recursive: true });
const assetsSrc = path.join(extDir, 'assets');
if (fs.existsSync(assetsSrc)) {
  fs.cpSync(assetsSrc, path.join(workDir, 'assets'), { recursive: true });
}

// Also include PRIVACY.md for store submission context
const privacy = path.join(extDir, '..', '..', 'PRIVACY.md');
if (fs.existsSync(privacy)) {
  fs.copyFileSync(privacy, path.join(workDir, 'PRIVACY.md'));
}
NODE

# Create zip (strip extra file attributes for better reproducibility)
rm -f "$OUT_ZIP"
(
  cd "$WORK"
  zip -rq -X "$OUT_ZIP" .
)

echo "Packed $OUT_ZIP (version $EXT_VER)"


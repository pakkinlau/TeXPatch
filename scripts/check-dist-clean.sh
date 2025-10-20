#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)

npm -w texpatch-core run build --silent
H1=$(mktemp)
find "$ROOT/packages/core/dist" -type f -print0 | sort -z | xargs -0 sha256sum > "$H1"

npm -w texpatch-core run build --silent
H2=$(mktemp)
find "$ROOT/packages/core/dist" -type f -print0 | sort -z | xargs -0 sha256sum > "$H2"

if diff -u "$H1" "$H2" >/dev/null; then
  echo "dist build is reproducible."
else
  echo "dist build differs between runs." >&2
  diff -u "$H1" "$H2" || true
  exit 1
fi

rm -f "$H1" "$H2"

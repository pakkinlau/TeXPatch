#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)

echo "[1/5] Build core"
cd "$ROOT"
npm i --silent
npm -w texpatch-core run build --silent

echo "[2/5] Run goldens"
npm -w texpatch-core run golden --silent

echo "[3/5] Run idempotence"
npm -w texpatch-core run idempotence --silent

echo "[4/5] Profiles sanity"
npm -w texpatch-core run profiles --silent

echo "[5/5] CLI e2e"
CLI="$ROOT/packages/core/dist/bin/texpatch.js"
GOLDEN_DIR="$ROOT/tests/golden"
fail=0; total=0
for in_md in "$GOLDEN_DIR"/G*.in.md; do
  base=$(basename "$in_md" .in.md)
  out_md="$GOLDEN_DIR/${base}.out.md"
  total=$((total+1))
  tmp=$(mktemp)
  node "$CLI" --profile katex < "$in_md" > "$tmp"
  if diff -u "$out_md" "$tmp" >/dev/null; then
    echo "[PASS] $base"
  else
    echo "[FAIL] $base" >&2
    fail=$((fail+1))
  fi
  rm -f "$tmp"
done
if (( fail > 0 )); then
  echo "CLI golden e2e failed: $fail/$total." >&2
  exit 1
fi

echo "Dist reproducibility"
cd "$ROOT"
bash scripts/check-dist-clean.sh

echo "Build extension"
npm -w texpatch-extension run build --silent

echo "All checks passed."

#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
CLI="$ROOT/packages/core/dist/bin/texpatch.js"
GOLDEN_DIR="$ROOT/tests/golden"

if [[ ! -f "$CLI" ]]; then
  echo "Build CLI first: (cd TeXPatch-core && npm run build)" >&2
  exit 2
fi

fail=0
total=0
for in_md in "$GOLDEN_DIR"/G*.in.md; do
  base=$(basename "$in_md" .in.md)
  out_md="$GOLDEN_DIR/${base}.out.md"
  total=$((total+1))
  tmp=$(mktemp)
  node "$CLI" --profile katex < "$in_md" > "$tmp"
  if diff -u "$out_md" "$tmp"; then
    echo "[PASS] $base"
  else
    echo "[FAIL] $base" >&2
    fail=$((fail+1))
  fi
  rm -f "$tmp"
done

echo
if (( fail == 0 )); then
  echo "CLI golden e2e passed ($total)."
else
  echo "CLI golden e2e failed: $fail/$total." >&2
  exit 1
fi

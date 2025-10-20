#!/usr/bin/env bash
set -euo pipefail

# Simple golden diff runner using the reference Python script.
# Usage: bash tests/run_golden_python.sh

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
TOOLS_PY="$ROOT_DIR/tools/gpt2md.py"
GOLDEN_DIR="$ROOT_DIR/tests/golden"

if [[ ! -f "$TOOLS_PY" ]]; then
  echo "Missing tools/gpt2md.py; aborting." >&2
  exit 1
fi

fail=0
total=0

for in_md in "$GOLDEN_DIR"/G*.in.md; do
  [[ -e "$in_md" ]] || continue
  base=$(basename "$in_md" .in.md)
  out_md="$GOLDEN_DIR/${base}.out.md"
  (( total++ ))
  if [[ ! -f "$out_md" ]]; then
    echo "[SKIP] $base — missing expected output" >&2
    continue
  fi
  tmp_out=$(mktemp)
  python3 "$TOOLS_PY" < "$in_md" > "$tmp_out"
  if diff -u --label "$base.expected" "$out_md" --label "$base.actual" "$tmp_out"; then
    echo "[PASS] $base"
  else
    echo "[FAIL] $base" >&2
    (( fail++ ))
  fi
  rm -f "$tmp_out"
done

echo
if (( fail == 0 )); then
  echo "All $total goldens passed."
else
  echo "$fail/$total goldens failed." >&2
  exit 1
fi


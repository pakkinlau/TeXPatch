#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
CORE_DIST="$ROOT/packages/core/dist"

if [[ ! -d "$CORE_DIST" ]]; then
  echo "Core dist not found. Build first." >&2
  exit 2
fi

TOTAL_BYTES=$(du -sb "$CORE_DIST" | awk '{print $1}')
MAX_TOTAL=${MAX_TOTAL:-5000000} # 5MB total default
MAX_FILE=${MAX_FILE:-1000000}   # 1MB per file default

FAIL=0
while IFS= read -r -d '' file; do
  sz=$(stat -c%s "$file")
  if (( sz > MAX_FILE )); then
    echo "File too large: $file ($sz bytes > $MAX_FILE)" >&2
    FAIL=1
  fi
done < <(find "$CORE_DIST" -type f -print0)

if (( TOTAL_BYTES > MAX_TOTAL )); then
  echo "Dist too large: $TOTAL_BYTES bytes > $MAX_TOTAL" >&2
  FAIL=1
fi

if (( FAIL == 0 )); then
  echo "Size check passed: total=$TOTAL_BYTES bytes."
else
  exit 1
fi


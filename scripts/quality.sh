#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)

if [[ "${CHECK_FORMAT:-0}" == "1" ]]; then
  echo "Format check"
  cd "$ROOT"
  npm run format:check --silent
fi

echo "Typecheck"
npm run typecheck --silent

echo "Build core"
npm -w texpatch-core run build --silent

echo "Goldens"
npm -w texpatch-core run golden --silent

echo "Idempotence"
npm -w texpatch-core run idempotence --silent

echo "Build extension"
npm -w texpatch-extension run build --silent

echo "Size budgets"
bash "$ROOT/scripts/size-check.sh"

echo "Quality checks passed."

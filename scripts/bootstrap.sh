#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

echo "Installing workspaces..."
npm i

echo "Building core..."
npm -w texpatch-core run build --silent

echo "Building extension..."
npm -w texpatch-extension run build --silent

echo "Running goldens & idempotence..."
npm -w texpatch-core run golden --silent
npm -w texpatch-core run idempotence --silent

echo "Bootstrap complete."


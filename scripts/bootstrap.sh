#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

echo "Installing workspaces..."
npm i

echo "Building core..."
npm -w packages/core run build --silent

echo "Building extension..."
npm -w texpatch-extension run build --silent

echo "Running goldens & idempotence..."
npm -w packages/core run golden --silent
npm -w packages/core run idempotence --silent

echo "Bootstrap complete."


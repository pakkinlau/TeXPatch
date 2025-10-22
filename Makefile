SHELL := /bin/bash

.PHONY: build test ci goldens idempotence profiles cli

build:
	cd packages/core && npm i && npm run build

goldens:
	cd packages/core && npm run golden

idempotence:
	cd packages/core && npm run idempotence

profiles:
	cd packages/core && npm run profiles

cli:
	cd packages/core && npm run build && node dist/bin/texpatch.js --help

test:
	bash scripts/test-all.sh

ci:
	bash scripts/quality.sh

quality:
	bash scripts/quality.sh

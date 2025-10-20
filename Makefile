SHELL := /bin/bash

.PHONY: build test ci goldens idempotence profiles cli

build:
	cd TeXPatch-core && npm i && npm run build

goldens:
	cd TeXPatch-core && npm run golden

idempotence:
	cd TeXPatch-core && npm run idempotence

profiles:
	cd TeXPatch-core && npm run profiles

cli:
	cd TeXPatch-core && npm run build && node dist/bin/texpatch.js --help

test:
	bash scripts/test-all.sh

ci:
	bash scripts/quality.sh

quality:
	bash scripts/quality.sh

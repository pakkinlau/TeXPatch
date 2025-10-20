Golden tests for TeXPatch (reference parity)

Contents
- Golden pairs G0–G6 as specified in the project brief
- A simple runner `tests/run_golden_python.sh` that feeds inputs through the reference Python script and diffs outputs

Run
- bash tests/run_golden_python.sh

Notes
- The Python script under tools/ is a wrapper that imports the working root-level gpt2md.py and streams stdin→stdout.
- These goldens define the desired behavior for the upcoming TypeScript core. The Python reference may not yet match some cases exactly; failures here help highlight gaps we’ll close in the TS implementation.
- Idempotence checks will be added alongside the TypeScript core in later blocks.


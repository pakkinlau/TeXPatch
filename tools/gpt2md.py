#!/usr/bin/env python3
# Wrapper to expose the reference implementation under tools/ for golden runs.

import sys
import os

HERE = os.path.abspath(os.path.dirname(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

try:
    import gpt2md_ref_impl as _ref
except Exception as e:
    raise SystemExit(f"Failed to import tools/gpt2md_ref_impl.py: {e}")

convert = getattr(_ref, "convert")

if __name__ == "__main__":
    data = sys.stdin.read()
    sys.stdout.write(convert(data))

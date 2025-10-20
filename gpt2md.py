#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gpt2md (stub) — Delegates to tools/gpt2md_ref_impl.py

This stub preserves the original CLI behavior (clipboard in/out)
while the reference implementation lives under tools/.
"""

import os
import sys

HERE = os.path.abspath(os.path.dirname(__file__))
TOOLS = os.path.join(HERE, 'tools')
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)

try:
    from gpt2md_ref_impl import convert  # type: ignore
except Exception as e:
    raise SystemExit(f"Failed to import tools/gpt2md_ref_impl.py: {e}")


if __name__ == "__main__":
    try:
        import pyperclip
    except Exception:
        print("Error: this mode needs 'pyperclip'. Install with: pip install pyperclip", file=sys.stderr)
        sys.exit(2)

    src = pyperclip.paste()
    if not src or not src.strip():
        print("Clipboard is empty. Copy some Markdown text first.", file=sys.stderr)
        sys.exit(2)

    out = convert(src)

    try:
        pyperclip.copy(out)
        print("Converted text copied to clipboard.\n")
    except Exception:
        pass

    print(out)


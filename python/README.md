# TeXPatch (Python)

TeXPatch fixes small TeX/LaTeX quirks in Markdown so it renders cleanly in KaTeX/MathJax.

This is a minimal Python port with a safe, local transform and a CLI.

## Install

```
pip install texpatch
```

## Usage

API:

```py
from texpatch import convert
print(convert('f(x)=|x|'))  # f(x)=\lvert x\rvert
```

CLI:

```
echo "f(x)=|x|" | python -m texpatch
```

Notes:
- Guardrails: does not modify fenced or inline code.
- For fuller rule coverage see the JavaScript library `texpatch`.

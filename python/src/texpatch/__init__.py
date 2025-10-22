import re

_FENCE_RE = re.compile(r"```[\s\S]*?```", re.MULTILINE)
_INLINE_RE = re.compile(r"`[^`\n]*`")

def _stash(text):
    store = []
    def _mark(m):
        store.append(m.group(0))
        return f"@@TEXPATCH{len(store)-1}@@"
    s = _FENCE_RE.sub(_mark, text)
    s = _INLINE_RE.sub(_mark, s)
    return s, store

def _restore(text, store):
    def rep(m):
        idx = int(m.group(1))
        return store[idx]
    return re.sub(r"@@TEXPATCH(\d+)@@", rep, text)

def convert(src: str, profile: str = "katex") -> str:
    """Minimal safe transform: absolute value bars -> \lvert ... \rvert, guarding code.

    This is a conservative subset to claim the PyPI name; additional rules can
    be added incrementally while preserving idempotence.
    """
    if not src:
        return src
    work, store = _stash(src)
    # |x| -> \lvert x \rvert (single-line, avoid crossing newlines)
    work = re.sub(r"\|([^|\n]+)\|", r"\\lvert \1\\rvert", work)
    return _restore(work, store)


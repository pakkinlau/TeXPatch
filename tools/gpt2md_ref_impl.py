#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reference implementation of the Markdown+TeX normalizer (Python).
This file is the canonical home for the Python reference used by tests.
"""

import re
import sys

# --------------------- Stash / restore helpers ---------------------

def stash_by_regex(text: str, pattern: str, token: str, flags=0):
    rgx = re.compile(pattern, flags)
    store = []
    def repl(m):
        store.append(m.group(0))
        return f'§§{token}{len(store)-1}§§'
    out = rgx.sub(repl, text)
    def restore(s: str):
        for i, chunk in enumerate(store):
            s = s.replace(f'§§{token}{i}§§', chunk)
        return s
    return out, restore


def stash_code_and_links(text: str):
    # fenced code, inline code, markdown links/images
    text, r1 = stash_by_regex(text, r'```[\s\S]*?```', 'CODE', re.DOTALL)
    text, r2 = stash_by_regex(text, r'`[^`\n]*`', 'IC')
    text, r3 = stash_by_regex(text, r'!?\[[^\]]*\]\([^)]+\)', 'LINK')
    def restore_all(s: str):
        s = r3(s); s = r2(s); s = r1(s)
        return s
    return text, restore_all


# --------------------- Display block makers ---------------------

def _replace_bold_inside_text(body: str) -> str:
    """\text{**foo**} → \text{\textbf{foo}} (non-nested)."""
    def sub_text(m):
        content = m.group(1)
        content = re.sub(r'\*\*([^*]+)\*\*', r'\\textbf{\1}', content)
        return r'\text{' + content + '}'
    for _ in range(3):
        body2 = re.sub(r'\\text\{([^{}]*)\}', sub_text, body)
        if body2 == body:
            break
        body = body2
    return body


def to_display_from_brackets(text: str) -> str:
    # \\[ … \\] → $$ … $$
    def repl(m):
        inner = _replace_bold_inside_text(m.group(1).strip())
        return "\n$$\n" + inner + "\n$$\n" if '\n' in inner else "$$ " + inner + " $$"
    return re.sub(r'\\\[\s*([\s\S]*?)\s*\\\]', repl, text)


def to_display_from_literal_square_blocks(text: str) -> str:
    # line "[" … later line "]" → single $$ … $$ block
    lines = text.splitlines()
    out, buf, in_blk = [], [], False
    for ln in lines:
        if not in_blk and re.fullmatch(r'\s*\[\s*', ln):
            in_blk, buf = True, []
            continue
        if in_blk and re.fullmatch(r'\s*\]\s*', ln):
            body = "\n".join(buf).strip()
            body = _replace_bold_inside_text(body)
            if out and out[-1].strip():
                out.append("")
            out.extend(["$$", body, "$$"])
            out.append("")
            in_blk, buf = False, []
            continue
        if in_blk:
            buf.append(ln)
        else:
            out.append(ln)
    if in_blk and buf:
        out.extend(["["] + buf)  # unmatched '[' — leave as-is
    return "\n".join(out)


# --------------------- “Math-only line” detection ---------------------

LIST_MARKER_RE = re.compile(r'^\s*(?:[-*+]|[0-9]{1,3}[.)])\s+')
MATH_HEAVY_CUES = (
    r'\displaystyle', r'\begin{', r'\boxed', r'\frac', r'\int', r'\sum', r'\prod', r'\lim',
    r'\Im', r'\Re', r'\mapsto', r'\Longleftrightarrow', r'\Rightarrow', r'\to', r'\longrightarrow'
)

def _strip_list_marker(s: str) -> str:
    return LIST_MARKER_RE.sub('', s, 1)


def _has_tex_control(s: str) -> bool:
    return bool(re.search(r'\\[A-Za-z]+', s))

def _strip_tex_groups_for_detection(s: str) -> str:
    # Remove \command{...}, _{...}, ^{...}, and <...> placeholders — detection only
    for _ in range(4):
        s2 = re.sub(r'\\[A-Za-z]+(?:\s*\{[^{}]*\})', '', s)
        if s2 == s: break
        s = s2
    s = re.sub(r'[_^]\s*\{[^{}]*\}', '', s)
    s = re.sub(r'<[^>\n]+>', '', s)
    return s

def _has_prose_words(s: str) -> bool:
    s2 = _strip_tex_groups_for_detection(s)
    s2 = re.sub(r'\\[A-Za-z]+', '', s2)  # drop bare controls like \phi
    tokens = re.findall(r'[A-Za-z]{2,}', s2)
    for t in tokens:
        if t.isupper():
            continue
        if len(t) >= 3:
            return True
    return False

def _math_coverage_ratio(s: str) -> float:
    math_chars = set(r'\{}[]()_=<>|^+-*/,.0123456789')
    return sum(1 for ch in s if ch in math_chars) / max(len(s), 1)

def is_math_only_line(raw_line: str) -> bool:
    # never treat list bullets as math-only
    if LIST_MARKER_RE.match(raw_line or ''):
        return False
    if not raw_line.strip() or raw_line.strip().startswith(('```', '§§', '$$')):
        return False
    line = _strip_list_marker(raw_line).strip()
    if not line or line.startswith(('$', '$$')):
        return False
    has_rel = bool(re.search(r'(?:==|=|<=|>=|<|>|\\le|\\ge|\\approx|\\sim)', line))
    if not _has_tex_control(line):
        return False
    if _has_prose_words(line):
        return False
    return (_math_coverage_ratio(line) >= 0.55) and (any(c in line for c in MATH_HEAVY_CUES) or has_rel)


def wrap_lonely_display_lines(text: str) -> str:
    lines = text.splitlines()
    out, i, n = [], 0, len(lines)

    def flush(block):
        if not block: return
        cleaned = []
        for j, L in enumerate(block):
            t = _strip_list_marker(L).strip()
            if j == 0 and t.startswith(r'\displaystyle'):
                t = t[len(r'\displaystyle'):].lstrip()
            cleaned.append(t)
        if out and out[-1].strip(): out.append("")
        out.extend(["$$", *cleaned, "$$"]); out.append("")

    inside_display = False
    while i < n:
        ln = lines[i]
        if ln.strip().startswith('$$'):
            inside_display = not inside_display
            out.append(ln); i += 1; continue
        if not inside_display and is_math_only_line(ln):
            blk = [ln]; i += 1
            while i < n and is_math_only_line(lines[i]):
                blk.append(lines[i]); i += 1
            flush(blk)
        else:
            out.append(ln); i += 1
    return "\n".join(out)


def whole_line_parenthesized_to_display(text: str) -> str:
    """
    Promote a line that's exactly '( <TeX> )' (after list-marker stripping) to $$…$$,
    but only if it is math-only by the same predicate.
    """
    out = []
    for raw in text.splitlines():
        core = _strip_list_marker(raw).strip()
        m = re.fullmatch(
            r'\(\s*(?P<body>[^()]*\\[A-Za-z]+[^()]*)\s*\)\s*'
            r'(?P<suf>(?:\^\{[^}]+\}|\^\d+|_\{[^}]+\}|_[A-Za-z0-9]+))?',  # <-- fixed ?P<suf>
            core
        )
        if m and is_math_only_line(raw):
            body = (m.group('body') + (m.group('suf') or '')).strip()
            if out and out[-1].strip():
                out.append("")
            out += ["$$", body, "$$", ""]
        else:
            out.append(raw)
    return "\n".join(out)


# --------------------- Inline conversions (outside $$) ---------------------

def legacy_inline_paren_to_dollar(text: str) -> str:
    return re.sub(r'\\\(\s*(.*?)\s*\\\)', lambda m: f'${m.group(1).strip()}$', text, flags=re.DOTALL)

def _valid_inline_math(inner: str) -> bool:
    s = inner.strip()
    if not s:
        return False
    if re.search(r'\b(e\.g\.|i\.e\.|see|figure|table)\b', s, re.IGNORECASE):
        return False
    if _has_tex_control(s):
        return not _has_prose_words(s)
    if re.search(r'[<>=^_+\-*/\\|]', s) and not _has_prose_words(s):
        return True
    return False

def conservative_parentheses_to_inline(text: str) -> str:
    out_lines = []
    for line in text.splitlines():
        if '(' not in line or ')' not in line:
            out_lines.append(line); continue

        pairs, stack = [], []
        for i, ch in enumerate(line):
            if ch == '(': stack.append(i)
            elif ch == ')' and stack:
                s = stack.pop(); pairs.append((s, i))

        cands = []
        for s, e in pairs:
            inner = line[s+1:e]
            if not _valid_inline_math(inner): continue
            j = e + 1
            while j < len(line) and line[j].isspace(): j += 1
            k = j
            if k < len(line) and line[k] in '^_':
                k += 1
                if k < len(line) and line[k] == '{':
                    depth = 1; k += 1
                    while k < len(line) and depth:
                        if line[k] == '{': depth += 1
                        elif line[k] == '}': depth -= 1
                        k += 1
                else:
                    while k < len(line) and line[k].isalnum(): k += 1
                endw = k
            else:
                endw = e + 1
            cands.append((s, e, endw))

        if not cands:
            out_lines.append(line); continue

        cands.sort(key=lambda t: (t[0], -t[1]))
        chosen, last_end = [], -1
        for s, e, endw in cands:
            if s >= last_end:
                chosen.append((s, e, endw)); last_end = endw

        new = line
        for s, e, endw in sorted(chosen, key=lambda t: t[0], reverse=True):
            inner = new[s+1:e]
            suffix = new[e+1:endw]
            new = new[:s] + f"${inner.strip()}{suffix}$" + new[endw:]
        out_lines.append(new)

    return "\n".join(out_lines)


# --------------------- Normalize math internals ---------------------

def _escape_literal_sets_and_indicators(b: str) -> str:
    """Escape the OUTERMOST {...} after ':=' or '=' and after \mathbb{1}/\mathbf{1}/\mathds{1}."""
    s = b

    def find_matching_brace(text, open_idx):
        depth = 0
        for j in range(open_idx, len(text)):
            ch = text[j]
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return j
        return -1

    indicator_rgx = re.compile(r'(\\(?:mathbb|mathbf|mathds)\{?1\}?)\s*$')

    i = 0
    out, cursor = [], 0
    while i < len(s):
        if s[i] == '{':
            j = i - 1
            while j >= 0 and s[j].isspace():
                j -= 1
            eq_trigger = (j >= 0 and s[j] == '=')
            colon_eq_trigger = (j >= 1 and s[j] == '=' and s[j-1] == ':')
            ind_trigger = bool(indicator_rgx.search(s[:i]))
            if eq_trigger or colon_eq_trigger or ind_trigger:
                close = find_matching_brace(s, i)
                if close != -1:
                    out.append(s[cursor:i]); out.append(r'\{')
                    out.append(s[i+1:close]); out.append(r'\}')
                    cursor = close + 1
                    i = cursor
                    continue
        i += 1
    out.append(s[cursor:])
    return ''.join(out)

def _normalize_star_and_big_forms(b: str) -> str:
    # \\mathrm{Name}*X or \\macro*X → underscore
    b = re.sub(r'(\\[A-Za-z]+(?:\{[^{}]+\})?)\s*\*\s*([A-Za-z])', r'\1_\2', b)
    # \\mathbb{R}*{...} → \\mathbb{R}_{...}
    b = re.sub(r'(\\mathbb\{[A-Za-z]\})\s*\*\s*\{([^{}]+)\}', r'\1_{\2}', b)
    # \\arg\\max*{...} / \\arg\\min*{...}
    b = re.sub(r'\\arg\\?max\s*\*\s*\{([^{}]+)\}', r'\\operatorname*{arg\\,max}_{\1}', b)
    b = re.sub(r'\\arg\\?min\s*\*\s*\{([^{}]+)\}', r'\\operatorname*{arg\\,min}_{\1}', b)
    # Generic fallback: \\foo*{...} → \\operatorname*{foo}_{...} (avoid double on operatorname*)
    b = re.sub(r'\\(?!operatorname\*)([A-Za-z]+)\s*\*\s*\{([^{}]+)\}', r'\\operatorname*{\1}_{\2}', b)
    # Big delimiter fixes
    b = re.sub(r'\\Big\s*\{', r'\\Big\\{', b)
    b = re.sub(r'\\big\s*\{', r'\\big\\{', b)
    b = re.sub(r'\\Big\s*\}', r'\\Big\\}', b)
    b = re.sub(r'\\big\s*\}', r'\\big\\}', b)
    return b

def _escape_underscores_in_textish(b: str) -> str:
    """
    Inside textish macros, escape unescaped underscores: _ → \_ 
    Covers: \text{…}, \texttt{…}, \textsf{…}, \textrm{…}, \textbf{…}, \textit{…}
    """
    def esc(m):
        macro = m.group(1)  # e.g., \text, \texttt, \textsf, ...
        content = m.group(2)
        content = re.sub(r'(?<!\\)_', r'\\_', content)
        return f'{macro}{{{content}}}'
    # Run a few passes to handle shallow nesting
    for _ in range(3):
        b2 = re.sub(r'(\\text(?:tt|sf|rm|bf|it)?)\{([^{}]*)\}', esc, b)
        if b2 == b:
            break
        b = b2
    return b

def _fix_math_body(b: str) -> str:
    # Bold inside \text
    def sub_text(m):
        content = m.group(1)
        content = re.sub(r'\*\*([^*]+)\*\*', r'\\textbf{\1}', content)
        return r'\text{' + content + '}'
    for _ in range(3):
        b2 = re.sub(r'\\text\{([^{}]*)\}', sub_text, b)
        if b2 == b:
            break
        b = b2

    # Placeholders & literals
    b = re.sub(r'\\texttt\{<([^{}>\n]+)>\}', r'\\texttt{\\textless \1\\textgreater}', b)
    b = re.sub(r'\\text\{<([^{}>\n]+)>\}',    r'\\text{\\textless \1\\textgreater}', b)
    b = re.sub(r'(?<!\\)#', r'\\#', b)
    b = re.sub(r'\^\s*<([^>\n]+)>', lambda m: r'\\texttt{^<' + m.group(1) + r'>}', b)
    b = re.sub(r'(\^<[^>]+>)\.', r'\1\\.', b)

    # Spacing
    b = re.sub(r'\\arg!', r'\\arg\\!', b)
    b = re.sub(r'(?<!\\)i!\s*\\left', r'i\\left', b)
    b = re.sub(r',\s*(\\frac)', r'\\,\\1', b)
    b = re.sub(r'(?<=\bi)\s*,\s*(?=(?:\\\(|\\frac))', r'\\,', b)

    # Collapse accidental extra backslashes
    b = re.sub(r'\\{2,}(?=[A-Za-z])', r'\\', b)

    # Right-delimiter repairs
    b = re.sub(r'\\right\s*=', r'\\right) =', b)
    b = re.sub(r'\\right\s*([,:;])', r'\\right) \1', b)
    b = re.sub(r'\\right\s*([+\-*/])', r'\\right) \1', b)

    # Close lone \left(
    if r'\left(' in b and r'\right)' not in b and r'\begin{cases}' in b:
        b = re.sub(r'\s*\\begin\{cases\}', r' \\right) = \\begin{cases}', b, count=1)
    if r'\left(' in b and r'\right)' not in b:
        b = re.sub(r'\)(\s*(?:$|[.,;:]))', r'\\right)\1', b, count=1)

    # Normalize stars & big delimiters; escape sets/indicators
    b = _normalize_star_and_big_forms(b)
    b = _escape_literal_sets_and_indicators(b)

    # **NEW**: escape underscores inside textish macros
    b = _escape_underscores_in_textish(b)

    return b


def normalize_math(text: str) -> str:
    # display $$…$$
    text = re.sub(
        r'\$\$\s*\n?(.*?)\n?\s*\$\$',
        lambda m: '$$\n' + _fix_math_body(m.group(1)) + '\n$$',
        text, flags=re.DOTALL
    )
    # inline $…$
    text = re.sub(
        r'(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)',
        lambda m: '$' + _fix_math_body(m.group(1)) + '$',
        text, flags=re.DOTALL
    )
    return text


# --------------------- Pipeline ---------------------

def convert(src: str) -> str:
    txt, restore_code = stash_code_and_links(src)
    txt = to_display_from_literal_square_blocks(txt)
    txt = to_display_from_brackets(txt)

    txt, restore_math_a = stash_by_regex(txt, r'\$\$[\s\S]*?\$\$', 'MATHA', re.DOTALL)

    txt = wrap_lonely_display_lines(txt)
    txt = whole_line_parenthesized_to_display(txt)

    txt, restore_math_b = stash_by_regex(txt, r'\$\$[\s\S]*?\$\$', 'MATHB', re.DOTALL)

    txt = legacy_inline_paren_to_dollar(txt)
    txt = conservative_parentheses_to_inline(txt)

    # merge '$z$^2' / '$z$_k' → '$z^2$' / '$z_k$'
    txt = re.sub(r'\$(.*?)\$(\s*)\^(\{[^}]+\}|\d+)', r'$\1^\3$', txt)
    txt = re.sub(r'\$(.*?)\$(\s*)_(\{[^}]+\}|[A-Za-z0-9]+)', r'$\1_\3$', txt)

    txt = restore_math_b(txt)
    txt = restore_math_a(txt)
    txt = normalize_math(txt)

    txt = restore_code(txt)
    return txt

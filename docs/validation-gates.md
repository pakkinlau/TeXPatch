# Validation Gates

TeXPatch uses two renderer gates plus structural checks.

## Why Gates Exist

Markdown math conversion is not reliable if it is checked only by looking at strings. A transformed document can still fail because:

- display math delimiters were not normalized;
- TeX commands remain outside math spans;
- a renderer rejects a delimiter or environment;
- a relation separator was malformed;
- a permissive renderer hides an error that a stricter renderer catches.

## Commands

```bash
npm run validate:katex -- output.md
npm run validate:mathjax -- output.md
```

Both scripts print JSON and exit non-zero on failure.

## KaTeX Gate

Script:

```bash
tools/katex-gate.mjs
```

Checks:

- leftover bracket blocks such as `[` or `# [` on a line by itself;
- bare TeX commands outside `$...$` or `$$...$$`;
- repeated standalone equals lines inside math;
- isolated standalone `=` lines without neighboring operands;
- KaTeX parse failures with `throwOnError: true`.

Use this as the strict first pass.

## MathJax Gate

Script:

```bash
tools/mathjax-gate.mjs
```

Checks:

- leftover bracket blocks;
- bare TeX commands outside math;
- MathJax error nodes such as `mjx-merror` and `data-mjx-error`.

MathJax is more tolerant than KaTeX, so it is not a replacement for KaTeX. It is useful because Obsidian is closer to MathJax than to KaTeX.

## Safe Transform Protocol

For important documents:

```bash
node packages/core/dist/bin/texpatch.js < input.md > /tmp/texpatch-candidate.md
npm run validate:katex -- /tmp/texpatch-candidate.md
npm run validate:mathjax -- /tmp/texpatch-candidate.md
cp /tmp/texpatch-candidate.md output.md
```

Do not overwrite the final file before both gates pass.

## What The Gates Do Not Prove

The gates prove renderer compatibility for extracted math spans. They do not prove that a reconstructed relation is mathematically intended. Any rule that infers missing syntax must stay narrow and be documented in [design-log.md](design-log.md).

# Design Log

This file records why TeXPatch rules and development gates exist. It is intentionally operational: each entry should explain the failure class, the chosen response, and the boundary of the rule.

## 2026-06-20: Renderer Gates Are Part of Development

Problem:

String transformations can produce Markdown that looks plausible but does not render. VT003P exposed three separate failure modes:

- bracket math left as `# [` ... `]`;
- repeated relation separators preserved as long `====` lines;
- TeX accepted by one renderer but rejected by another.

Decision:

Keep local renderer validation inside the repo:

- `katex` as a strict syntax gate;
- `mathjax` as an Obsidian-adjacent compatibility gate.

Boundary:

These engines are dev dependencies only. The core transformer stays deterministic and does not call renderer engines during normal conversion. The Chrome extension should not carry the heavy validation loop unless a strict mode is explicitly designed later.

## 2026-06-20: Extension Is Not the Rule-Discovery Surface

Problem:

Chrome extension debugging is slow, release-bound, and poor at explaining multi-line document failures.

Decision:

Rule discovery happens in the repo through corpus samples, golden tests, and validation gates. The extension bundles the already-tested core logic.

Boundary:

The extension may later expose a lightweight strict mode, but it should report validation failures rather than learn rules in the browser.

## 2026-06-20: Bracket Blocks With Heading Markers

Problem:

Some copied Markdown contains display math opened as `# [` instead of `[`. Markdown treats this as a heading, so Obsidian does not render the contained TeX.

Decision:

Treat `# [` through `###### [` as display-math openers when they appear on their own line.

Boundary:

Only whole-line bracket openers are converted. Inline prose with brackets is not touched.

## 2026-06-20: Relation Separators

Problem:

LLM output sometimes uses lines such as `============================` between a left-hand side and a right-hand side. Preserving that text breaks renderer output. Blindly deleting it loses the relation.

Decision:

Inside math bodies, repeated standalone equals lines collapse to a single `=`. For known boxed definition layouts, TeXPatch may infer a missing `=` between a plausible left-hand side and the following right-hand side block.

Boundary:

Inference is constrained to boxed math bodies and known set-intersection-with-empty-set patterns. It is not a general algebraic reconstruction engine.

## 2026-06-20: Literal Set Delimiters

Problem:

Input may contain `\left{` and `\right}` where renderers expect escaped braces: `\left\{` and `\right\}`.

Decision:

Normalize those forms inside math bodies.

Boundary:

Only delimiter commands are rewritten. Ordinary braces remain governed by the existing set/indicator brace rules.

## 2026-06-20: Row Spacing

Problem:

Cases/array rows may contain `,\[4pt]`, which parses as an invalid display-math opener in KaTeX. The intended row spacing form is `,\\[4pt]`.

Decision:

Inside math bodies, repair `\[<dimension>]` row spacing to `\\[<dimension>]`.

Boundary:

Only explicit dimensions such as `4pt`, `0.5em`, `2mm`, and similar unit forms are repaired.

## 2026-06-20: Placeholder Underscores

Problem:

Some source has placeholder suffixes like `^{\mathrm{FS},_}` or `\mathcal B_t^_,` that break KaTeX.

Decision:

Escape isolated placeholder underscores inside math bodies.

Boundary:

This is a renderability repair, not a semantic reconstruction. It preserves the visible placeholder rather than guessing the missing symbol.

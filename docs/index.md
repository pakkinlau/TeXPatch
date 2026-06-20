---
title: TeXPatch Documentation
description: Deterministic TeX/Markdown cleanup and local renderer validation.
---

# TeXPatch Documentation

TeXPatch is a deterministic transformer for LLM-generated Markdown math. The project goal is practical renderability, not mathematical proof or semantic rewriting.

Start here:

- [Design Log](design-log.md): decisions, constraints, and current rule philosophy.
- [Validation Gates](validation-gates.md): KaTeX and MathJax local answer-checking.
- [Chrome Extension](extension.md): extension build and release workflow.

## Operating Principle

Every meaningful transformation rule should be justified by a reproducible failure:

1. capture the source pattern;
2. transform with the core library;
3. validate with structure checks and renderer engines;
4. add a narrow regression fixture;
5. keep the Chrome extension as a packaged UI over the same proven core.

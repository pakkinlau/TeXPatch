TeXPatch Core

Summary
- Idempotent TypeScript library to normalize Markdown+TeX for KaTeX/MathJax.
- Pure string transforms; no network; safe around code fences/inline code/links.

Install
```
npm i texpatch
```

API (ESM)
```ts
import { convert, detect, profiles } from 'texpatch';
const out = convert(src, { profile: 'katex' });
const diags = detect(src);
```

Profiles
- katex (default): full pipeline R1–R7
- pandoc: R1, R2, R5, R6
- github: minimal R1; fences `$$…$$` as ```latex … ```

CLI
```
texpatch --profile katex < in.md > out.md
# Optional: strip final newline for byte-for-byte parity with files that lack it
texpatch --profile katex --strip-final-newline < in.md > out.md
```

Development
- Build: `npm run build`
- Goldens: `npm run golden`
- Idempotence: `npm run idempotence`
- Profiles sanity: `npm run profiles`

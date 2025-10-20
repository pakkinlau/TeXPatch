import { findMatchingBrace } from './util/brace.js';
import { stashByRegex } from './util/stash.js';
import type { RuleConfig } from './rules/profiles.js';

function replaceBoldInsideText(body: string): string {
  let b = body;
  for (let i = 0; i < 3; i++) {
    const b2 = b.replace(/\\text\{([^{}]*)\}/g, (_m, c) => {
      const cc = String(c).replace(/\*\*([^*]+)\*\*/g, '\\\\textbf{$1}');
      return `\\text{${cc}}`;
    });
    if (b2 === b) break;
    b = b2;
  }
  return b;
}

function escapeUnderscoresInTextish(b: string): string {
  let s = b;
  for (let i = 0; i < 3; i++) {
    const s2 = s.replace(/(\\text(?:tt|sf|rm|bf|it)?)\{([^{}]*)\}/g, (_m, macro, content) => {
      const cc = String(content).replace(/(?<!\\)_/g, '\\_');
      return `${macro}{${cc}}`;
    });
    if (s2 === s) break;
    s = s2;
  }
  return s;
}

// Star-forms and big-delimiter helpers with rule gating
function applyStarOnly(b: string): string {
  let s = b;
  s = s.replace(/(\\[A-Za-z]+(?:\{[^{}]+\})?)\s*\*\s*([A-Za-z])/g, '$1_$2');
  s = s.replace(/(\\mathbb\{[A-Za-z]\})\s*\*\s*\{([^{}]+)\}/g, '$1_{$2}');
  s = s.replace(/\\arg\\?max\s*\*\s*\{([^{}]+)\}/g, '\\operatorname*{arg\\,max}_{$1}');
  s = s.replace(/\\arg\\?min\s*\*\s*\{([^{}]+)\}/g, '\\operatorname*{arg\\,min}_{$1}');
  s = s.replace(/\\(?!operatorname\*)([A-Za-z]+)\s*\*\s*\{([^{}]+)\}/g, '\\operatorname*{$1}_{$2}');
  return s;
}

function applyBigOnly(b: string): string {
  const s = b;
  let out: string[] = [];
  let cursor = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\') {
      const rest = s.slice(i);
      const m = rest.match(/^\\(Big|big)\s*\{/);
      if (m) {
        const size = m[1];
        const j = i + m[0].length - 1; // index of '{'
        const close = findMatchingBrace(s, j);
        if (close !== -1) {
          out.push(s.slice(cursor, i));
          out.push('\\' + size + '\\{');
          // If a sized closer already exists (e.g., \Big}) preserve it
          const before = s.slice(Math.max(0, close - 5), close);
          const hasSizedCloser = /\\Big$/.test(before) || /\\big$/.test(before);
          if (hasSizedCloser) {
            const macroLen = /\\Big$/.test(before) ? 4 : 3; // length without backslash accounted below
            const totalLen = macroLen + 1; // include backslash
            out.push(s.slice(j + 1, close - totalLen));
            out.push(s.slice(close - totalLen, close));
            out.push('\\}');
          } else {
            out.push(s.slice(j + 1, close));
            out.push('\\' + size + '\\}');
          }
          cursor = close + 1;
          i = cursor - 1;
          continue;
        }
      }
    }
  }
  out.push(s.slice(cursor));
  return out.join('');
}

function applyRulesStarAndBig(b: string, rules?: RuleConfig): string {
  const wantStar = !rules || rules.R4_starForms;
  const wantBig = !rules || rules.R5_bigDelimiters;
  let s = b;
  if (wantStar) s = applyStarOnly(s);
  if (wantBig) s = applyBigOnly(s);
  return s;
}

function escapeSetBracesOnly(b: string): string {
  const s = b;
  let out: string[] = [];
  let cursor = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') {
      let j = i - 1;
      while (j >= 0 && /\s/.test(s[j]!)) j--;
      const eqTrigger = j >= 0 && s[j] === '=';
      const colonEqTrigger = j >= 1 && s[j] === '=' && s[j - 1] === ':';
      if (eqTrigger || colonEqTrigger) {
        const close = findMatchingBrace(s, i);
        if (close !== -1) {
          out.push(s.slice(cursor, i));
          out.push('\\{');
          out.push(s.slice(i + 1, close));
          out.push('\\}');
          cursor = close + 1;
          i = cursor - 1;
          continue;
        }
      }
    }
  }
  out.push(s.slice(cursor));
  return out.join('');
}

function escapeIndicatorBracesOnly(b: string): string {
  const s = b;
  const indicatorRgx = /(\\(?:mathbb|mathbf|mathds)\{?1\}?)\s*$/;
  let out: string[] = [];
  let cursor = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{' && indicatorRgx.test(s.slice(0, i))) {
      const close = findMatchingBrace(s, i);
      if (close !== -1) {
        out.push(s.slice(cursor, i));
        out.push('\\{');
        out.push(s.slice(i + 1, close));
        out.push('\\}');
        cursor = close + 1;
        i = cursor - 1;
        continue;
      }
    }
  }
  out.push(s.slice(cursor));
  return out.join('');
}

function applySetIndicatorRules(b: string, rules?: RuleConfig): string {
  const wantSet = !rules || rules.R2_setGlyphBraces;
  const wantInd = !rules || rules.R3_indicatorBraces;
  if (wantSet && wantInd) return escapeLiteralSetsAndIndicators(b);
  if (wantSet) return escapeSetBracesOnly(b);
  if (wantInd) return escapeIndicatorBracesOnly(b);
  return b;
}

function normalizeStarAndBigForms(b: string): string {
  let s = b;
  // \mathrm{Name}*X or \macro*X → underscore
  s = s.replace(/(\\[A-Za-z]+(?:\{[^{}]+\})?)\s*\*\s*([A-Za-z])/g, '$1_$2');
  // \mathbb{R}*{...} → \mathbb{R}_{...}
  s = s.replace(/(\\mathbb\{[A-Za-z]\})\s*\*\s*\{([^{}]+)\}/g, '$1_{$2}');
  // \arg\max*{...} / \arg\min*{...}
  s = s.replace(/\\arg\\?max\s*\*\s*\{([^{}]+)\}/g, '\\operatorname*{arg\\,max}_{$1}');
  s = s.replace(/\\arg\\?min\s*\*\s*\{([^{}]+)\}/g, '\\operatorname*{arg\\,min}_{$1}');
  // Generic fallback: \foo*{...} → \operatorname*{foo}_{...} (avoid double on operatorname*)
  s = s.replace(/\\(?!operatorname\*)([A-Za-z]+)\s*\*\s*\{([^{}]+)\}/g, '\\operatorname*{$1}_{$2}');
  // Big delimiter fixes
  s = s.replace(/\\Big\s*\{/g, '\\Big\\{');
  s = s.replace(/\\big\s*\{/g, '\\big\\{');
  s = s.replace(/\\Big\s*\}/g, '\\Big\\}');
  s = s.replace(/\\big\s*\}/g, '\\big\\}');
  return s;
}

function escapeLiteralSetsAndIndicators(b: string): string {
  const s = b;
  const indicatorRgx = /(\\(?:mathbb|mathbf|mathds)\{?1\}?)\s*$/;
  let out: string[] = [];
  let cursor = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') {
      let j = i - 1;
      while (j >= 0 && /\s/.test(s[j]!)) j--;
      const eqTrigger = j >= 0 && s[j] === '=';
      const colonEqTrigger = j >= 1 && s[j] === '=' && s[j - 1] === ':';
      const indTrigger = indicatorRgx.test(s.slice(0, i));
      if (eqTrigger || colonEqTrigger || indTrigger) {
        const close = findMatchingBrace(s, i);
        if (close !== -1) {
          out.push(s.slice(cursor, i));
          out.push('\\{');
          out.push(s.slice(i + 1, close));
          out.push('\\}');
          cursor = close + 1;
          i = cursor - 1;
          continue;
        }
      }
    }
  }
  out.push(s.slice(cursor));
  return out.join('');
}

export function fixMathBody(body: string, rules?: RuleConfig): string {
  let b = body;
  b = replaceBoldInsideText(b);

  // Escape #, placeholders, minor spacing fixes similar to reference
  b = b.replace(/(?<!\\)#/g, '\\#');
  b = b.replace(/,\s*(\\frac)/g, '\\,\\$1');
  b = b.replace(/(?<=\bi)\s*,\s*(?=(?:\\\(|\\frac))/g, '\\,');
  b = b.replace(/\\{2,}(?=[A-Za-z])/g, '\\');

  // Right-delimiter repairs
  if (!rules || rules.R6_rightDelimiterFixes) {
    b = b.replace(/\\right\s*=/g, '\\right) =');
    b = b.replace(/\\right\s*([,:;])/g, '\\right) $1');
    b = b.replace(/\\right\s*([+\-*/])/g, '\\right) $1');
  }

  // Close lone \left(
  if (b.includes('\\left(') && !b.includes('\\right)')) {
    b = b.replace(/\)(\s*(?:$|[.,;:]))/, '\\right)$1');
  }

  // Unicode arrow to LaTeX command, but DO NOT convert inside textish macros
  {
    const stashed = stashByRegex(b, /(\\text(?:tt|sf|rm|bf|it)?\{[^{}]*\})/g, 'TEXT');
    let work = stashed.text.replace(/→/g, '\\to');
    work = work.replace(/\\to(?=[0-9A-Za-z])/g, '\\to ');
    b = stashed.restore(work);
  }

  b = applyRulesStarAndBig(b, rules);
  b = applySetIndicatorRules(b, rules);
  if (!rules || rules.R1_underscoreInText) b = escapeUnderscoresInTextish(b);

  return b;
}

export function normalizeMath(text: string, rules?: RuleConfig): string {
  // display $$…$$
  let out = text.replace(/\$\$\s*\n?([\s\S]*?)\n?\s*\$\$/g, (_m, inner) => {
    return `$$\n${fixMathBody(String(inner), rules)}\n$$`;
  });
  // inline $…$
  out = out.replace(/(?<!\$)\$(?!\$)([\s\S]+?)(?<!\$)\$(?!\$)/g, (_m, inner) => {
    return `$${fixMathBody(String(inner), rules)}$`;
  });
  return out;
}

// Apply a conservative subset of math normalization outside explicit math.
// This covers textish underscore escaping, star-forms, big delimiters,
// and set/indicator glyph braces appearing in loose TeX fragments.
export function normalizeLooseOutsideMath(text: string, rules?: RuleConfig): string {
  let s = text;
  if (!rules || rules.R1_underscoreInText) s = escapeUnderscoresInTextish(s);
  s = applyRulesStarAndBig(s, rules);
  s = applySetIndicatorRules(s, rules);
  return s;
}

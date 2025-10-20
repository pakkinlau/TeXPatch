import { stashByRegex, stashCodeAndLinks } from './util/stash.js';
import { normalizeMath, normalizeLooseOutsideMath } from './normalize.js';
import { profiles, type ProfileConfig, type ProfileName } from './rules/profiles.js';

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

export function toDisplayFromBrackets(text: string): string {
  return text.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_m, inner) => {
    const body = replaceBoldInsideText(String(inner).trim());
    if (body.includes('\n')) return `\n$$\n${body}\n$$\n`;
    return `$$ ${body} $$`;
  });
}

export function toDisplayFromLiteralSquareBlocks(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let inBlk = false;
  let buf: string[] = [];
  for (const ln of lines) {
    if (!inBlk && /^\s*\[\s*$/.test(ln)) { inBlk = true; buf = []; continue; }
    if (inBlk && /^\s*\]\s*$/.test(ln)) {
      const body = replaceBoldInsideText(buf.join('\n').trim());
      if (out.length && out[out.length - 1].trim()) out.push('');
      out.push('$$'); out.push(body); out.push('$$'); out.push('');
      inBlk = false; buf = []; continue;
    }
    if (inBlk) buf.push(ln); else out.push(ln);
  }
  if (inBlk && buf.length) { out.push('['); out.push(...buf); }
  return out.join('\n');
}

const LIST_MARKER_RE = /^\s*(?:[-*+]|[0-9]{1,3}[.)])\s+/;
const MATH_HEAVY_CUES = [
  '\\displaystyle', '\\begin{', '\\boxed', '\\frac', '\\int', '\\sum', '\\prod', '\\lim',
  '\\Im', '\\Re', '\\mapsto', '\\Longleftrightarrow', '\\Rightarrow', '\\to', '\\longrightarrow'
];

function stripListMarker(s: string): string { return s.replace(LIST_MARKER_RE, ''); }

function hasTexControl(s: string): boolean { return /\\[A-Za-z]+/.test(s); }

function stripTexGroupsForDetection(s: string): string {
  let t = s;
  for (let i = 0; i < 4; i++) {
    const t2 = t.replace(/\\[A-Za-z]+(?:\s*\{[^{}]*\})/g, '');
    if (t2 === t) break; t = t2;
  }
  t = t.replace(/[_^]\s*\{[^{}]*\}/g, '');
  t = t.replace(/<[^>\n]+>/g, '');
  return t;
}

function hasProseWords(s: string): boolean {
  const s2 = stripTexGroupsForDetection(s).replace(/\\[A-Za-z]+/g, '');
  const tokens = s2.match(/[A-Za-z]{2,}/g) || [];
  for (const t of tokens) {
    if (t === t.toUpperCase()) continue;
    if (t.length >= 3) return true;
  }
  return false;
}

function mathCoverageRatio(s: string): number {
  const mathChars = new Set('\\{}[]()_=<>|^+-*/,.0123456789');
  let cnt = 0;
  for (const ch of s) if (mathChars.has(ch)) cnt++;
  return cnt / Math.max(s.length, 1);
}

export function isMathOnlyLine(rawLine: string): boolean {
  if (LIST_MARKER_RE.test(rawLine || '')) return false;
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith('```') || trimmed.startsWith('§§') || trimmed.startsWith('$$')) return false;
  const line = stripListMarker(rawLine).trim();
  if (!line || line.startsWith('$') || line.startsWith('$$')) return false;
  const hasRel = /(==|=|<=|>=|<|>|\\le|\\ge|\\approx|\\sim)/.test(line);
  if (!hasTexControl(line)) return false;
  if (hasProseWords(line)) return false;
  return (mathCoverageRatio(line) >= 0.55) && (MATH_HEAVY_CUES.some(c => line.includes(c)) || hasRel);
}

export function wrapLonelyDisplayLines(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  let insideDisplay = false;
  const isCand = (s: string) => {
    const t = s.trim();
    if (!t) return false;
    if (t.startsWith('```') || t.startsWith('§§') || t.startsWith('$$')) return false;
    if (/\\(?:displaystyle|lim|frac|sum|int|prod|boxed|begin\{)/.test(t) && /(=|\\to|\\le|\\ge|<|>)/.test(t)) return true;
    return isMathOnlyLine(s);
  };
  const flush = (block: string[]) => {
    if (block.length < 2) { out.push(...block); return; }
    const cleaned: string[] = [];
    for (let j = 0; j < block.length; j++) {
      let t = stripListMarker(block[j]).trim();
      if (j === 0 && t.startsWith('\\displaystyle')) t = t.slice('\\displaystyle'.length).trimStart();
      cleaned.push(t);
    }
    if (out.length && out[out.length - 1].trim()) out.push('');
    out.push('$$', ...cleaned, '$$'); out.push('');
  };
  while (i < lines.length) {
    const ln = lines[i];
    if (ln.trim().startsWith('$$')) { insideDisplay = !insideDisplay; out.push(ln); i++; continue; }
    if (!insideDisplay && isCand(ln)) {
      const blk: string[] = [ln]; i++;
      while (i < lines.length && isCand(lines[i])) { blk.push(lines[i]); i++; }
      flush(blk);
    } else { out.push(ln); i++; }
  }
  return out.join('\n');
}

export function wholeLineParenthesizedToDisplay(text: string): string {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const core = stripListMarker(raw).trim();
    const m = core.match(/^\(\s*([^()]*(?:\\[A-Za-z]+)[^()]*)\s*\)\s*((?:\^\{[^}]+\}|\^\d+|_\{[^}]+\}|_[A-Za-z0-9]+))?\s*$/);
    if (m && isMathOnlyLine(raw)) {
      const body = (m[1] + (m[2] || '')).trim();
      if (out.length && out[out.length - 1].trim()) out.push('');
      out.push('$$', body, '$$', '');
    } else { out.push(raw); }
  }
  return out.join('\n');
}

export function legacyInlineParenToDollar(text: string): string {
  return text.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_m, inner) => `$${String(inner).trim()}$`);
}

function validInlineMath(inner: string): boolean {
  const s = inner.trim();
  if (!s) return false;
  if (/\b(e\.g\.|i\.e\.|see|figure|table)\b/i.test(s)) return false;
  if (/\\[A-Za-z]+/.test(s)) {
    return !hasProseWords(s);
  }
  if (/[<>=^_+\-*/\\|]/.test(s) && !hasProseWords(s)) return true;
  return false;
}

export function conservativeParenthesesToInline(text: string): string {
  const outLines: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.includes('(') || !line.includes(')')) { outLines.push(line); continue; }
    const pairs: Array<[number, number]> = [];
    const stack: number[] = [];
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '(') stack.push(i);
      else if (ch === ')' && stack.length) { const s = stack.pop()!; pairs.push([s, i]); }
    }
    const cands: Array<[number, number, number]> = [];
    for (const [s, e] of pairs) {
      const inner = line.slice(s + 1, e);
      if (!validInlineMath(inner)) continue;
      let j = e + 1; while (j < line.length && /\s/.test(line[j]!)) j++;
      let k = j; let endw = e + 1;
      if (k < line.length && (line[k] === '^' || line[k] === '_')) {
        k++;
        if (k < line.length && line[k] === '{') {
          let depth = 1; k++;
          while (k < line.length && depth) {
            if (line[k] === '{') depth++; else if (line[k] === '}') depth--; k++;
          }
        } else {
          while (k < line.length && /[A-Za-z0-9]/.test(line[k]!)) k++;
        }
        endw = k;
      } else { endw = e + 1; }
      cands.push([s, e, endw]);
    }
    if (!cands.length) { outLines.push(line); continue; }
    cands.sort((a, b) => (a[0] - b[0]) || (b[1] - a[1]));
    const chosen: Array<[number, number, number]> = [];
    let lastEnd = -1;
    for (const c of cands) { if (c[0] >= lastEnd) { chosen.push(c); lastEnd = c[2]; } }
    let newLine = line;
    for (const [s, e, endw] of [...chosen].sort((a,b)=>b[0]-a[0])) {
      const inner = newLine.slice(s + 1, e);
      const suffix = newLine.slice(e + 1, endw);
      newLine = newLine.slice(0, s) + `$${inner.trim()}${suffix}$` + newLine.slice(endw);
    }
    outLines.push(newLine);
  }
  return outLines.join('\n');
}

export function mergeSplitSuffixes(text: string): string {
  // Merge $z$^2 → $z^2$
  let t = text.replace(/\$(.*?)\$(\s*)\^(\{[^}]+\}|\d+)/g, '$$$1^$3$');
  // Merge $z$_k → $z_k$, and unwrap braces if single alnum: _{k} → _k
  t = t.replace(/\$(.*?)\$(\s*)_(\{[^}]+\}|[A-Za-z0-9]+)/g, (_m, body: string, _sp: string, suf: string) => {
    const unwrapped = suf.startsWith('{') && suf.endsWith('}') ? suf.slice(1, -1) : suf;
    const compact = /^[A-Za-z0-9]$/.test(unwrapped) ? unwrapped : `{${unwrapped}}`;
    return `$${body}_${compact}$`;
  });
  return t;
}

export type ConvertOptions = { profile?: ProfileName };

function fenceMathAsCode(text: string): string {
  // $$ ... $$ => ```latex ... ``` ; leave inline $...$ unchanged
  return text.replace(/\$\$\s*\n?([\s\S]*?)\n?\s*\$\$/g, (_m, inner) => {
    const body = String(inner).trim();
    return '```latex\n' + body + '\n```';
  });
}

export function convert(src: string, opts: ConvertOptions = {}): string {
  const cfg: ProfileConfig = profiles[opts.profile ?? 'katex'];
  let { text: txt, restore: restoreCode } = stashCodeAndLinks(src);
  txt = toDisplayFromLiteralSquareBlocks(txt);
  txt = toDisplayFromBrackets(txt);

  const stashA = stashByRegex(txt, /\$\$[\s\S]*?\$\$/g, 'MATHA');
  txt = stashA.text;

  txt = wrapLonelyDisplayLines(txt);
  txt = wholeLineParenthesizedToDisplay(txt);

  const stashB = stashByRegex(txt, /\$\$[\s\S]*?\$\$/g, 'MATHB');
  txt = stashB.text;

  // Stash inline $...$ to avoid inserting $ inside existing math
  const stashI = stashByRegex(txt, /(?<!\$)\$(?!\$)[\s\S]+?(?<!\$)\$(?!\$)/g, 'MATHI');
  txt = stashI.text;
  txt = legacyInlineParenToDollar(txt);
  txt = conservativeParenthesesToInline(txt);
  txt = stashI.restore(txt);
  if (cfg.R7_splitSuffixMerge) txt = mergeSplitSuffixes(txt);

  txt = stashB.restore(txt);
  txt = stashA.restore(txt);
  if (cfg.fenceMathAsCode) {
    txt = fenceMathAsCode(txt);
  } else {
    txt = normalizeMath(txt, cfg);
    // Apply conservative loose normalization outside math (R1, R2, R4, R5 subset)
    txt = normalizeLooseOutsideMath(txt, cfg);
  }
  // Collapse excessive trailing blank lines
  txt = txt.replace(/\n{3,}$/g, '\n\n');

  txt = restoreCode(txt);
  return txt;
}


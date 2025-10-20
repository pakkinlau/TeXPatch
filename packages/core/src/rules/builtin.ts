export type Span = { start: number; end: number };

export function findAll(pattern: RegExp, text: string): Span[] {
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  const spans: Span[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    spans.push({ start: m.index, end: m.index + m[0].length });
    // Prevent zero-width loops
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return spans;
}

export const RE = {
  underscoreInText: /\\text(?:tt|sf|rm|bf|it)?\{[^{}]*_[^{}]*\}/g,
  starForms: /\\(?:arg\\?max|arg\\?min|mathbb\{[A-Za-z]\}|[A-Za-z]+)\s*\*\s*(?:\{|[A-Za-z])/g,
  bigBraces: /\\(?:Big|big)\s*\{/g,
  rightDelims: /\\right\s*(?:=|[,;:+\-*\/])/g,
  splitSuffix: /\$[^$]+\$\s*[\^_]/g,
};


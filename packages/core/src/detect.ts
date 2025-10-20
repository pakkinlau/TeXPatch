import { stashCodeAndLinks } from './util/stash.js';
import { RE, findAll, Span } from './rules/builtin.js';

export type Diagnostic = {
  id: 'underscore-in-text' | 'star-forms' | 'big-braces' | 'right-delims' | 'split-suffix';
  count: number;
  spans: Span[];
};

export function detect(src: string): Diagnostic[] {
  const { text } = stashCodeAndLinks(src); // skip code/links
  // For simplicity, we do not stash $$…$$ here to catch star-forms in math.
  const diags: Diagnostic[] = [];

  const add = (id: Diagnostic['id'], spans: Span[]) => {
    if (spans.length) diags.push({ id, count: spans.length, spans });
  };

  add('underscore-in-text', findAll(RE.underscoreInText, text));
  add('star-forms', findAll(RE.starForms, text));
  add('big-braces', findAll(RE.bigBraces, text));
  add('right-delims', findAll(RE.rightDelims, text));
  add('split-suffix', findAll(RE.splitSuffix, text));

  return diags;
}


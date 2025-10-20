import { convert } from '../src/index.js';

const g1 = 'E^\\star = \\arg\\max*{S\\subseteq E};\\ \\mathbb{R}*{\\ge 0}';

const katex = convert(g1, { profile: 'katex' });
if (!katex.includes('operatorname*{arg\\,max}') || !katex.includes('mathbb{R}_{')) {
  console.error('[FAIL] katex should normalize star-forms');
  process.exit(1);
}

const pandoc = convert(g1, { profile: 'pandoc' });
if (pandoc.includes('operatorname*{arg\\,max}') || pandoc.includes('mathbb{R}_{')) {
  console.error('[FAIL] pandoc should NOT normalize star-forms');
  process.exit(1);
}

const g5in = "\\[\nF = \\mathrm{Compact}\\circ \\mathrm{Validate}\n\\]";
const g5out = convert(g5in, { profile: 'katex' });
if (!g5out.includes('$$')) {
  console.error('[FAIL] katex display build expected');
  process.exit(1);
}

const g5gh = convert(g5in, { profile: 'github' });
if (!g5gh.includes('```latex') || g5gh.includes('$$')) {
  console.error('[FAIL] github should fence math as code');
  process.exit(1);
}

console.log('Profiles test passed.');


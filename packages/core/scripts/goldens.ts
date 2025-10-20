import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convert } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// dist/scripts -> dist -> package root -> packages -> repo root
const pkgRoot = join(__dirname, '..', '..'); // packages/core
const repoRoot = join(pkgRoot, '..', '..');  // repo root
const goldenDir = join(repoRoot, 'tests', 'golden');

let fail = 0;
let total = 0;

function runPair(inPath: string) {
  const base = basename(inPath).replace(/\.in\.md$/, '');
  const outPath = join(goldenDir, `${base}.out.md`);
  const input = readFileSync(inPath, 'utf8');
  const expected = readFileSync(outPath, 'utf8');
  const actual = convert(input);
  total++;
  if (actual === expected) {
    console.log(`[PASS] ${base}`);
  } else {
    console.error(`[FAIL] ${base}`);
    console.error('--- expected');
    console.error(expected);
    console.error('--- actual');
    console.error(actual);
    fail++;
  }
}

const files = readdirSync(goldenDir)
  .filter(f => /G\d+\.in\.md$/.test(f))
  .map(f => join(goldenDir, f))
  .sort();

files.forEach(runPair);

if (fail) {
  console.error(`\n${fail}/${total} goldens failed.`);
  process.exit(1);
} else {
  console.log(`\nAll ${total} goldens passed.`);
}

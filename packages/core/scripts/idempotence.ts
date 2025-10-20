import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convert } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const pkgRoot = join(__dirname, '..', '..');
const repoRoot = join(pkgRoot, '..', '..');
const goldenDir = join(repoRoot, 'tests', 'golden');

let fail = 0;
let total = 0;

const files = readdirSync(goldenDir)
  .filter(f => /\.in\.md$/.test(f))
  .map(f => join(goldenDir, f))
  .sort();

for (const inPath of files) {
  const name = inPath.split('/').pop();
  const src = readFileSync(inPath, 'utf8');
  const once = convert(src);
  const twice = convert(once);
  total++;
  if (once !== twice) {
    console.error(`[FAIL] Not idempotent for ${name}`);
    fail++;
  } else {
    console.log(`[PASS] Idempotent for ${name}`);
  }
}

if (fail) {
  console.error(`\n${fail}/${total} idempotence checks failed.`);
  process.exit(1);
} else {
  console.log(`\nAll ${total} idempotence checks passed.`);
}

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detect } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const repoRoot = join(__dirname, '..', '..');
const workspaceRoot = join(repoRoot, '..');
const goldenDir = join(workspaceRoot, 'tests', 'golden');

const files = readdirSync(goldenDir).filter(f => /\.in\.md$/.test(f));
for (const f of files) {
  const src = readFileSync(join(goldenDir, f), 'utf8');
  const diags = detect(src);
  console.log(f + ': ' + JSON.stringify(diags));
}


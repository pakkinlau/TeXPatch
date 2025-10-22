#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
let sharp;
try { sharp = require('sharp'); } catch (e) {
  console.error('sharp not installed. Run: npm i -D sharp');
  process.exit(2);
}

const SRC_CANDIDATES = [
  'extension_icon.png',
  'assets/extension_icon.png',
  'logo.png',
  'assets/logo.png'
];

const outDir = path.join('extension', 'icons');
fs.mkdirSync(outDir, { recursive: true });

let src = SRC_CANDIDATES.find(p => fs.existsSync(p));

async function ensureSrc() {
  if (src) return src;
  // Create a simple placeholder 256x256 dark square
  const buf = await sharp({
    create: { width: 256, height: 256, channels: 4, background: '#141418' }
  }).png().toBuffer();
  const ph = path.join('assets', '_placeholder_icon.png');
  fs.mkdirSync('assets', { recursive: true });
  fs.writeFileSync(ph, buf);
  src = ph;
  return src;
}

const sizes = [16, 48, 128];

(async () => {
  const base = await ensureSrc();
  for (const s of sizes) {
    const out = path.join(outDir, `texpatch_${s}.png`);
    await sharp(base).resize(s, s).png().toFile(out);
    console.log('wrote', out);
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});


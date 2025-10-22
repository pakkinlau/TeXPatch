#!/usr/bin/env node
import { build } from 'esbuild';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const isProd = process.env.NODE_ENV === 'production';

async function main() {
  // Clean dist to avoid stale outputs
  try { rmSync('dist', { recursive: true, force: true }); } catch {}
  await build({
    entryPoints: {
      popup: 'src/popup.ts',
      content: 'src/content.ts',
      background: 'src/background.ts',
    },
    outdir: 'dist',
    bundle: true,
    minify: isProd,
    sourcemap: false,
    platform: 'browser',
    format: 'esm',
    target: ['chrome109'],
    treeShaking: true,
    legalComments: 'none',
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
    logLevel: 'info',
  });

  // Sanity: ensure bundled outputs don’t contain bare imports to 'texpatch'
  const outPopup = readFileSync(join('dist', 'popup.js'), 'utf8');
  if (/from\s+['"]texpatch['"]/.test(outPopup)) {
    console.error('popup.js still references texpatch; bundling failed.');
    process.exit(1);
  }
  const outContent = readFileSync(join('dist', 'content.js'), 'utf8');
  if (/from\s+['"]texpatch['"]/.test(outContent)) {
    console.error('content.js still references texpatch; bundling failed.');
    process.exit(1);
  }

  console.log('Extension bundled successfully.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

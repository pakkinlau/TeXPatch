#!/usr/bin/env node
import { stdin as input, stdout as output, stderr as err } from 'node:process';
import { convert, profiles } from '../src/index.js';

function parseArgs(argv: string[]) {
  const out: { profile?: string; help?: boolean; version?: boolean; stripFinalNewline?: boolean } = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') out.help = true;
    else if (a === '-v' || a === '--version') out.version = true;
    else if (a === '-p' || a === '--profile') { out.profile = argv[++i]; }
    else if (a.startsWith('--profile=')) out.profile = a.split('=')[1];
    else if (a === '--strip-final-newline' || a === '--strip-eof-nl') out.stripFinalNewline = true;
  }
  return out;
}

async function readAllStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    input.setEncoding('utf8');
    input.on('data', (chunk) => (data += chunk));
    input.on('end', () => resolve(data));
    input.on('error', reject);
  });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    output.write(
      [
        'Usage: texpatch [--profile katex|pandoc|github] [--strip-final-newline] < in.md > out.md',
        '',
        'Reads Markdown from stdin and writes normalized Markdown to stdout.',
        'Profiles:',
        '  - katex (default): full pipeline (R1–R7)',
        '  - pandoc: R1, R2, R5, R6',
        '  - github: fence display math as code + R1',
        '',
        'Flags:',
        '  --strip-final-newline  Remove a trailing final newline in output for parity with files that lack it.',
        ''
      ].join('\n')
    );
    return;
  }
  if (args.version) {
    output.write('texpatch-core CLI\n');
    return;
  }
  const profile = (args.profile ?? 'katex') as keyof typeof profiles;
  if (!(profile in profiles)) {
    err.write(`Unknown profile: ${args.profile}\n`);
    process.exit(2);
  }
  const src = await readAllStdin();
  let out = convert(src, { profile });
  // Preserve input's trailing newline presence for exact parity with fixtures
  const inHasFinalNl = /\r?\n$/.test(src);
  const outHasFinalNl = /\r?\n$/.test(out);
  if (!inHasFinalNl && outHasFinalNl) {
    // Remove a single trailing newline (handle both \n and \r\n)
    out = out.replace(/\r?\n$/, '');
  }
  if (args.stripFinalNewline) {
    out = out.replace(/(\r?\n)+$/g, '');
  }
  output.write(out);
}

main().catch((e) => {
  err.write(String(e) + '\n');
  process.exit(1);
});

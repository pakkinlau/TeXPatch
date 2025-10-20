#!/usr/bin/env node
import clipboard from 'clipboardy';
import { convert, profiles } from 'texpatch-core';

function parseArgs(argv) {
  const out = { profile: 'katex', help: false, version: false, echo: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') out.help = true;
    else if (a === '-v' || a === '--version') out.version = true;
    else if (a === '-e' || a === '--echo') out.echo = true;
    else if (a === '-p' || a === '--profile') { out.profile = argv[++i]; }
    else if (a.startsWith('--profile=')) out.profile = a.split('=')[1];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log([
      'Usage: texpatch-clip [--profile katex|pandoc|github] [--echo]',
      '',
      'Reads text from the system clipboard, normalizes it, and writes back to the clipboard.',
      'Profiles:',
      '  - katex (default)  - full pipeline',
      '  - pandoc           - subset for PDF pipelines',
      '  - github           - minimal; fences display math as code',
      '',
      'Flags:',
      '  --echo  Print the converted text to stdout as well',
      ''
    ].join('\n'));
    return;
  }
  if (!(args.profile in profiles)) {
    console.error(`Unknown profile: ${args.profile}`);
    process.exit(2);
  }

  const src = await clipboard.read();
  const out = convert(src, { profile: args.profile });
  await clipboard.write(out);
  if (args.echo) process.stdout.write(out);
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});

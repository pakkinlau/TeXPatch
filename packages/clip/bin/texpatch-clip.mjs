#!/usr/bin/env node
import clipboard from 'clipboardy';
import { convert, detect, profiles } from 'texpatch';

function parseArgs(argv) {
  const out = { profile: 'katex', source: 'openai', help: false, version: false, echo: false, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') out.help = true;
    else if (a === '-v' || a === '--version') out.version = true;
    else if (a === '-e' || a === '--echo') out.echo = true;
    else if (a === '--json') out.json = true;
    else if (a === '-p' || a === '--profile') { out.profile = argv[++i]; }
    else if (a.startsWith('--profile=')) out.profile = a.split('=')[1];
    else if (a === '--source') { out.source = argv[++i] || 'openai'; }
    else if (a.startsWith('--source=')) out.source = a.split('=')[1];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log([
      'Usage: npm run clip -- [--source openai|generic] [--profile katex|pandoc|github] [--echo] [--json]',
      '',
      'Reads text from the system clipboard, normalizes it, and writes back to the clipboard.',
      'Profiles:',
      '  - katex (default)  - full pipeline',
      '  - pandoc           - subset for PDF pipelines',
      '  - github           - minimal; fences display math as code',
      'Source hints (ignored in v1, for future expansion): openai (default), generic',
      '',
      'Flags:',
      '  --echo   Print the converted text to stdout as well',
      '  --json   Print machine-readable stats JSON (no human text)',
      ''
    ].join('\n'));
    return;
  }
  if (!(args.profile in profiles)) {
    console.error(`Unknown profile: ${args.profile}`);
    process.exit(2);
  }

  const src = await clipboard.read();
  const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const before = detect(src);
  const out = convert(src, { profile: args.profile, source: args.source });
  const after = detect(out);
  const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const ms = Math.max(0, t1 - t0);

  await clipboard.write(out);

  if (args.echo) {
    process.stdout.write(out);
  } else if (args.json) {
    const stats = {
      source: args.source,
      target: args.profile,
      time_ms: Math.round(ms),
      chars_in: src.length,
      chars_out: out.length,
      lines_in: src.split(/\r?\n/).length,
      lines_out: out.split(/\r?\n/).length,
      before: Object.fromEntries(before.map(d => [d.id, d.count])),
      after: Object.fromEntries(after.map(d => [d.id, d.count])),
    };
    process.stdout.write(JSON.stringify(stats) + '\n');
  } else {
    const fmt = (arr) => arr.filter(d => d.count > 0).map(d => `  - ${d.id}: ${d.count}`).join('\n') || '  (none)';
    const linesIn = src.split(/\r?\n/).length;
    const linesOut = out.split(/\r?\n/).length;
    const msg = [
      'Copied converted text to clipboard.',
      `Source: ${args.source}  Target: ${args.profile}`,
      `Time: ${Math.round(ms)} ms`,
      `Size: ${src.length} → ${out.length} chars; lines: ${linesIn} → ${linesOut}`,
      'Findings before:',
      fmt(before),
      'Findings after:',
      fmt(after),
      ''
    ].join('\n');
    process.stderr.write(msg);
  }
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});

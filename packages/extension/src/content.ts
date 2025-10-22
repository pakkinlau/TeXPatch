import { convert, profiles } from 'texpatch';

let currentProfile: keyof typeof profiles = 'katex';
let removeBold = false;

function loadSettings() {
  chrome.storage.sync.get({ profile: 'katex', removeBold: false }, (res) => {
    currentProfile = (res.profile || 'katex') as keyof typeof profiles;
    removeBold = !!res.removeBold;
  });
}

loadSettings();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.profile) currentProfile = (changes.profile.newValue || 'katex') as keyof typeof profiles;
  if (changes.removeBold) removeBold = !!changes.removeBold.newValue;
});

function getSelectedText(): string {
  const ae = document.activeElement as Element | null;
  if (ae && (ae.tagName === 'TEXTAREA' || (ae.tagName === 'INPUT' && (ae as HTMLInputElement).type === 'text'))) {
    const el = ae as HTMLInputElement | HTMLTextAreaElement;
    const start = (el as any).selectionStart ?? 0;
    const end = (el as any).selectionEnd ?? start;
    return String(el.value).slice(start, end);
  }
  return window.getSelection()?.toString() || '';
}

// Removed auto-convert-on-copy to avoid unexpected behavior on sites with custom copy buttons.

// Handle context-menu and keyboard command to copy converted
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'COPY_CONVERTED') {
    try {
      const text = getSelectedText();
      if (!text) return;
      let out = convert(text, { profile: currentProfile });
      if (removeBold) out = stripBoldMarkdown(out);
      doWriteClipboard(out, `<pre style="white-space:pre-wrap;">${escapeHtml(out)}</pre>`).then(
        () => sendResponse({ ok: true }),
        () => sendResponse({ ok: false })
      );
    } catch {
      sendResponse({ ok: false });
    }
    return true; // async
  }
  if (msg && msg.type === 'WRITE_CLIPBOARD') {
    const text = String(msg.text || '');
    const html = typeof msg.html === 'string' ? msg.html : `<pre style="white-space:pre-wrap;">${escapeHtml(text)}</pre>`;
    doWriteClipboard(text, html).then(
      () => sendResponse({ ok: true }),
      () => sendResponse({ ok: false })
    );
    return true;
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function doWriteClipboard(text: string, html: string): Promise<void> {
  try {
    const item = new ClipboardItem({
      'text/plain': new Blob([text], { type: 'text/plain' }),
      'text/html': new Blob([html], { type: 'text/html' }),
    });
    await navigator.clipboard.write([item]);
    return;
  } catch {
    // Try execCommand with a contentEditable div to set both HTML and plain text
    try {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.style.position = 'fixed';
      div.style.left = '-9999px';
      div.innerHTML = html;
      document.body.appendChild(div);
      const range = document.createRange();
      range.selectNodeContents(div);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      if (!document.execCommand('copy')) throw new Error('execCommand copy failed');
      div.remove();
      return;
    } catch (e) {
      throw e;
    }
  }
}

// Remove Markdown bold markers (**) outside code fences, inline code, and math ($/$$)
function stripBoldMarkdown(input: string): string {
  let inFence = false;
  let fenceToken: '```' | '~~~' | '' = '';
  let inDisplayMath = false;

  const lines = input.split(/\r?\n/);
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const trimmed = line.trimStart();
    if (!inFence && (/^```/.test(trimmed) || /^~~~/.test(trimmed))) {
      inFence = true;
      fenceToken = trimmed.startsWith('```') ? '```' : '~~~';
      continue;
    } else if (inFence && fenceToken && trimmed.startsWith(fenceToken)) {
      inFence = false;
      fenceToken = '';
      continue;
    }
    if (inFence) continue;

    let out = '';
    let i = 0;
    let inInlineCode = false;
    let inlineCodeTicks = 0;
    let inInlineMath = false;
    let bracketDepth = 0;

    const L = line.length;
    while (i < L) {
      const ch = line[i];
      if (!inInlineCode && ch === '`') {
        let n = 0;
        while (i + n < L && line[i + n] === '`') n++;
        inInlineCode = true;
        inlineCodeTicks = n;
        out += line.slice(i, i + n);
        i += n;
        continue;
      }
      if (inInlineCode && ch === '`') {
        let n = 0;
        while (i + n < L && line[i + n] === '`') n++;
        if (n >= inlineCodeTicks) {
          inInlineCode = false;
          inlineCodeTicks = 0;
        }
        out += line.slice(i, i + n);
        i += n;
        continue;
      }
      if (inInlineCode) { out += ch; i++; continue; }

      const prev = i > 0 ? line[i - 1] : '';
      if (ch === '[') { bracketDepth++; out += ch; i++; continue; }
      if (ch === ']' && bracketDepth > 0) { bracketDepth--; out += ch; i++; continue; }

      if (!inInlineMath && !inDisplayMath && line.startsWith('$$', i) && prev !== '\\') {
        inDisplayMath = true; out += '$$'; i += 2; continue;
      }
      if (inDisplayMath && line.startsWith('$$', i) && prev !== '\\') {
        inDisplayMath = false; out += '$$'; i += 2; continue;
      }
      if (!inDisplayMath && ch === '$' && prev !== '\\' && line[i + 1] !== '$') {
        inInlineMath = !inInlineMath; out += ch; i++; continue;
      }

      if (!inInlineMath && !inDisplayMath && bracketDepth === 0 && line.startsWith('**', i)) {
        i += 2; continue;
      }
      out += ch; i++;
    }
    lines[li] = out;
  }
  return lines.join('\n');
}

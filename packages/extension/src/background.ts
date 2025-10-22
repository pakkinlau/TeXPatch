import { convert, profiles } from 'texpatch';

chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({ id: 'texpatch-copy', title: 'Copy converted', contexts: ['selection'] });
  } catch {}
});

async function getCurrentProfileAndFlags(): Promise<{ profile: keyof typeof profiles; removeBold: boolean }> {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ profile: 'katex', removeBold: false }, (res) => {
      resolve({ profile: (res.profile || 'katex') as keyof typeof profiles, removeBold: !!res.removeBold });
    });
  });
}

function stripBoldMarkdown(input: string): string {
  let inFence = false;
  let fenceToken: '```' | '~~~' | '' = '';
  let inDisplayMath = false;
  const lines = input.split(/\r?\n/);
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const trimmed = line.trimStart();
    if (!inFence && (/^```/.test(trimmed) || /^~~~/.test(trimmed))) {
      inFence = true; fenceToken = trimmed.startsWith('```') ? '```' : '~~~'; continue;
    } else if (inFence && fenceToken && trimmed.startsWith(fenceToken)) {
      inFence = false; fenceToken = ''; continue;
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
        let n = 0; while (i + n < L && line[i + n] === '`') n++;
        inInlineCode = true; inlineCodeTicks = n; out += line.slice(i, i + n); i += n; continue;
      }
      if (inInlineCode && ch === '`') {
        let n = 0; while (i + n < L && line[i + n] === '`') n++;
        if (n >= inlineCodeTicks) { inInlineCode = false; inlineCodeTicks = 0; }
        out += line.slice(i, i + n); i += n; continue;
      }
      if (inInlineCode) { out += ch; i++; continue; }
      const prev = i > 0 ? line[i - 1] : '';
      if (ch === '[') { bracketDepth++; out += ch; i++; continue; }
      if (ch === ']' && bracketDepth > 0) { bracketDepth--; out += ch; i++; continue; }
      if (!inInlineMath && !inDisplayMath && line.startsWith('$$', i) && prev !== '\\') { inDisplayMath = true; out += '$$'; i += 2; continue; }
      if (inDisplayMath && line.startsWith('$$', i) && prev !== '\\') { inDisplayMath = false; out += '$$'; i += 2; continue; }
      if (!inDisplayMath && ch === '$' && prev !== '\\' && line[i + 1] !== '$') { inInlineMath = !inInlineMath; out += ch; i++; continue; }
      if (!inInlineMath && !inDisplayMath && bracketDepth === 0 && line.startsWith('**', i)) { i += 2; continue; }
      out += ch; i++;
    }
    lines[li] = out;
  }
  return lines.join('\n');
}

async function copyConvertedFromTab(tabId: number) {
  try {
    // Read selection text from page
    const [{ result: selected = '' } = { result: '' }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const ae = document.activeElement as Element | null;
        if (ae && (ae.tagName === 'TEXTAREA' || (ae.tagName === 'INPUT' && (ae as HTMLInputElement).type === 'text'))) {
          const el = ae as HTMLInputElement | HTMLTextAreaElement;
          const s: any = (el as any).selectionStart ?? 0;
          const e: any = (el as any).selectionEnd ?? s;
          return String((el as any).value || '').slice(s, e);
        }
        return window.getSelection()?.toString() || '';
      },
    });
    if (!selected) return;
    const { profile, removeBold } = await getCurrentProfileAndFlags();
    let out = convert(selected, { profile });
    if (removeBold) out = stripBoldMarkdown(out);

    // Try writing via Clipboard API in background
    try {
      const item = new ClipboardItem({
        'text/plain': new Blob([out], { type: 'text/plain' }),
        'text/html': new Blob([`<pre style="white-space:pre-wrap;">${out.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c] || c)}</pre>`], { type: 'text/html' }),
      });
      await navigator.clipboard.write([item]);
      return;
    } catch {}
    // Fallback: inject copy helper into the page
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (h: string) => {
        try {
          const div = document.createElement('div');
          div.contentEditable = 'true';
          div.style.position = 'fixed';
          div.style.left = '-9999px';
          div.innerHTML = h;
          document.body.appendChild(div);
          const range = document.createRange();
          range.selectNodeContents(div);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
          document.execCommand('copy');
          div.remove();
        } catch {}
      },
      args: [`<pre style="white-space:pre-wrap;">${out.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c] || c)}</pre>`],
    });
  } catch {}
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'texpatch-copy' || !tab?.id) return;
  copyConvertedFromTab(tab.id);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'copy-converted' && tab?.id) {
    copyConvertedFromTab(tab.id);
  }
});

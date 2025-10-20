import { convert, profiles } from 'texpatch-core';

let currentProfile: keyof typeof profiles = 'katex';

function loadSettings() {
  chrome.storage.sync.get({ profile: 'katex' }, (res) => {
    currentProfile = (res.profile || 'katex') as keyof typeof profiles;
  });
}

loadSettings();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.profile) currentProfile = (changes.profile.newValue || 'katex') as keyof typeof profiles;
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
      const out = convert(text, { profile: currentProfile });
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

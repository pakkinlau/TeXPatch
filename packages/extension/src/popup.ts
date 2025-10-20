import { convert, profiles, detect } from 'texpatch-core';

function getActiveTabId(): Promise<number> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (tab && tab.id != null) resolve(tab.id);
      else reject(new Error('No active tab'));
    });
  });
}

async function getSelectionFromPage(): Promise<string> {
  const tabId = await getActiveTabId();
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.getSelection()?.toString() || '',
  });
  const first = results?.[0];
  return (first && (first as any).result) || '';
}


function previewConverted(text: string, profile: keyof typeof profiles): string {
  return convert(text, { profile });
}

export function initPopup() {
  const elBtn = document.getElementById('btnConvert') as HTMLButtonElement;
  const elBtnClipboard = document.getElementById('btnClipboard') as HTMLButtonElement;
  const elStatus = document.getElementById('status') as HTMLSpanElement;
  const elIn = document.getElementById('in') as HTMLTextAreaElement | null;
  const elOut = document.getElementById('out') as HTMLPreElement | null;
  const elSelFrom = document.getElementById('selFrom') as HTMLSelectElement | null;
  const elSelTo = document.getElementById('selTo') as HTMLSelectElement | null;

  const getProfiles = async (): Promise<{ from: string; to: string; targetProfile: keyof typeof profiles }> => {
    return new Promise((resolve) => {
      chrome.storage.sync.get({ from: 'openai', to: 'obsidian', profile: 'katex' }, (res) => {
        const from = (res.from || 'openai') as string;
        const to = (res.to || 'obsidian') as string;
        const targetProfile = (res.profile || mapToProfile(to)) as keyof typeof profiles;
        resolve({ from, to, targetProfile });
      });
    });
  };
  const setProfiles = async (from: string, to: string): Promise<void> => {
    return new Promise((resolve) => {
      const profile = mapToProfile(to);
      chrome.storage.sync.set({ from, to, profile }, () => resolve());
    });
  };

  function mapToProfile(to: string): keyof typeof profiles {
    switch (to) {
      case 'obsidian':
      case 'quarto-html':
        return 'katex'; // MathJax-safe
      case 'quarto-pdf':
        return 'pandoc';
      case 'github':
        return 'github';
      default:
        return 'katex';
    }
  }

  const setStatus = (msg: string, ok = true) => {
    elStatus.textContent = msg;
    elStatus.style.color = ok ? '#2a7' : '#c33';
    if (msg) setTimeout(() => (elStatus.textContent = ''), 1500);
  };

  (async () => {
    const { from, to, targetProfile } = await getProfiles();
    if (elSelFrom) elSelFrom.value = from as string;
    if (elSelTo) elSelTo.value = to as string;
    if (elIn && elOut) {
      const update = () => {
        elOut.textContent = previewConverted(
          elIn.value,
          (elSelTo?.value ? mapToProfile(elSelTo.value) : targetProfile)
        );
      };
      elIn.addEventListener('input', update);
      update();
    }
  })();

  elSelFrom?.addEventListener('change', async () => {
    const from = elSelFrom.value || 'openai';
    const to = elSelTo?.value || 'obsidian';
    await setProfiles(from, to);
    setStatus(`From: ${from}`);
  });

  elSelTo?.addEventListener('change', async () => {
    const from = elSelFrom?.value || 'openai';
    const to = elSelTo.value || 'obsidian';
    await setProfiles(from, to);
    if (elIn && elOut) elOut.textContent = previewConverted(elIn.value, mapToProfile(to));
    setStatus(`To: ${to}`);
  });

  // Presets removed for a cleaner UI


  elBtn?.addEventListener('click', async () => {
    try {
      elBtn.disabled = true;
      setStatus('Working…');
      const p = mapToProfile(elSelTo?.value || 'obsidian');
      const sel = await getSelectionFromPage();
      const t0 = performance.now();
      const before = detect(sel);
      const converted = previewConverted(sel, p);
      const after = detect(converted);
      const t1 = performance.now();
      await writeClipboardBoth(converted);
      setStatus(statsLine(p, t1 - t0, before, after));
    } catch (e: any) {
      setStatus(e?.message || String(e), false);
    } finally {
      elBtn.disabled = false;
    }
  });

  elBtnClipboard?.addEventListener('click', async () => {
    try {
      elBtnClipboard.disabled = true;
      setStatus('Working…');
      const p = mapToProfile(elSelTo?.value || 'obsidian');
      // Read clipboard as text (prefer text/plain; fallback to readText)
      const text = await readClipboardText();
      if (!text || text.length === 0) {
        setStatus('Clipboard is empty or not text', false);
        return;
      }
      const t0 = performance.now();
      const before = detect(text);
      const out = previewConverted(text, p);
      const after = detect(out);
      const t1 = performance.now();
      await writeClipboardBoth(out);
      setStatus(statsLine(p, t1 - t0, before, after));
    } catch (e: any) {
      setStatus(e?.message || 'Clipboard read failed', false);
    } finally {
      elBtnClipboard.disabled = false;
    }
  });
}

// Auto-initialize when loaded in the popup context.
try {
  if (typeof document !== 'undefined') {
    initPopup();
  }
} catch {}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toHtmlPre(s: string): string {
  // Preserve formatting on paste targets that prefer HTML
  return `<pre style="white-space:pre-wrap;">${escapeHtml(s)}</pre>`;
}

async function writeClipboardBoth(text: string) {
  const html = toHtmlPre(text);
  try {
    const item = new ClipboardItem({
      'text/plain': new Blob([text], { type: 'text/plain' }),
      'text/html': new Blob([html], { type: 'text/html' }),
    });
    await navigator.clipboard.write([item]);
    return;
  } catch {}
  // Fallback: delegate to content script
  try {
    const tabId = await getActiveTabId();
    await new Promise((resolve) =>
      chrome.tabs.sendMessage(
        tabId,
        { type: 'WRITE_CLIPBOARD', text, html },
        () => resolve(null)
      )
    );
  } catch {}
}

async function readClipboardText(): Promise<string> {
  // Try ClipboardItem API to prefer text/plain
  try {
    // @ts-ignore
    const items: ClipboardItem[] = await (navigator.clipboard as any).read();
    for (const it of items) {
      // @ts-ignore
      if (it.types && it.types.includes('text/plain')) {
        // @ts-ignore
        const blob = await it.getType('text/plain');
        const txt = await blob.text();
        if (txt) return txt;
      }
    }
  } catch {}
  // Fallback to readText
  try {
    const t = await navigator.clipboard.readText();
    return t || '';
  } catch {
    return '';
  }
}

function statsLine(profile: keyof typeof profiles, ms: number, before: any[], after: any[]): string {
  const b = before.filter(d => d.count > 0).map(d => `${d.id}:${d.count}`).join(', ') || 'none';
  const a = after.filter(d => d.count > 0).map(d => `${d.id}:${d.count}`).join(', ') || 'none';
  return `Converted (${profile}) • ${Math.round(ms)} ms • before: ${b} → after: ${a}`;
}

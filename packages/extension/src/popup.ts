import { convert, profiles, detect } from 'texpatch';

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


function previewConverted(text: string, profile: keyof typeof profiles, removeBold: boolean): string {
  const converted = convert(text, { profile });
  return removeBold ? stripBoldMarkdown(converted) : converted;
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
    // Toggle code fence
    if (!inFence && (/^```/.test(trimmed) || /^~~~/.test(trimmed))) {
      inFence = true;
      fenceToken = trimmed.startsWith('```') ? '```' : '~~~';
      continue; // leave line unchanged
    } else if (inFence && fenceToken && trimmed.startsWith(fenceToken)) {
      inFence = false;
      fenceToken = '';
      continue; // leave line unchanged
    }
    if (inFence) continue; // do not modify inside fenced code

    // Scan the line and remove ** outside inline code and math
    let out = '';
    let i = 0;
    let inInlineCode = false;
    let inlineCodeTicks = 0; // number of backticks that opened the inline code span
    let inInlineMath = false;
    let bracketDepth = 0; // track [ ... ] to avoid altering links/images text

    const L = line.length;
    while (i < L) {
      const ch = line[i];

      // Handle inline code start/end (supports multiple backticks)
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
      if (inInlineCode) {
        out += ch;
        i++;
        continue;
      }

      // Escape handling
      const prev = i > 0 ? line[i - 1] : '';

      // Track bracket depth for links/images
      if (ch === '[') {
        bracketDepth++;
        out += ch;
        i++;
        continue;
      }
      if (ch === ']' && bracketDepth > 0) {
        bracketDepth--;
        out += ch;
        i++;
        continue;
      }

      // Handle display math $$ toggling
      if (!inInlineMath && !inDisplayMath && line.startsWith('$$', i) && prev !== '\\') {
        inDisplayMath = true;
        out += '$$';
        i += 2;
        continue;
      }
      if (inDisplayMath && line.startsWith('$$', i) && prev !== '\\') {
        inDisplayMath = false;
        out += '$$';
        i += 2;
        continue;
      }

      // Handle inline math $ toggling (when not in $$)
      if (!inDisplayMath && ch === '$' && prev !== '\\' && line[i + 1] !== '$') {
        inInlineMath = !inInlineMath;
        out += ch;
        i++;
        continue;
      }

      // Strip bold markers '**' only when not in math/links
      if (!inInlineMath && !inDisplayMath && bracketDepth === 0 && line.startsWith('**', i)) {
        i += 2; // skip both asterisks
        continue;
      }

      out += ch;
      i++;
    }

    lines[li] = out;
  }

  return lines.join('\n');
}

export function initPopup() {
  const elBtn = document.getElementById('btnConvert') as HTMLButtonElement;
  const elBtnClipboard = document.getElementById('btnClipboard') as HTMLButtonElement;
  const elStatus = document.getElementById('status') as HTMLSpanElement;
  const elIn = document.getElementById('in') as HTMLTextAreaElement | null;
  const elOut = document.getElementById('out') as HTMLPreElement | null;
  const elSelFrom = document.getElementById('selFrom') as HTMLSelectElement | null;
  const elSelTo = document.getElementById('selTo') as HTMLSelectElement | null;
  const elChkRemoveBold = document.getElementById('chkRemoveBold') as HTMLInputElement | null;

  const getSettings = async (): Promise<{ from: string; to: string; targetProfile: keyof typeof profiles; removeBold: boolean }> => {
    return new Promise((resolve) => {
      chrome.storage.sync.get({ from: 'openai', to: 'obsidian', profile: 'katex', removeBold: false }, (res) => {
        const from = (res.from || 'openai') as string;
        const to = (res.to || 'obsidian') as string;
        const targetProfile = (res.profile || mapToProfile(to)) as keyof typeof profiles;
        const removeBold = !!res.removeBold;
        resolve({ from, to, targetProfile, removeBold });
      });
    });
  };
  const setProfiles = async (from: string, to: string): Promise<void> => {
    return new Promise((resolve) => {
      const profile = mapToProfile(to);
      chrome.storage.sync.set({ from, to, profile }, () => resolve());
    });
  };
  const setRemoveBold = async (v: boolean): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ removeBold: !!v }, () => resolve());
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
    const { from, to, targetProfile, removeBold } = await getSettings();
    if (elSelFrom) elSelFrom.value = from as string;
    if (elSelTo) elSelTo.value = to as string;
    if (elChkRemoveBold) elChkRemoveBold.checked = !!removeBold;
    if (elIn && elOut) {
      const update = () => {
        const rm = elChkRemoveBold?.checked || false;
        elOut.textContent = previewConverted(
          elIn.value,
          (elSelTo?.value ? mapToProfile(elSelTo.value) : targetProfile),
          rm
        );
      };
      elIn.addEventListener('input', update);
      elChkRemoveBold?.addEventListener('change', async () => {
        await setRemoveBold(!!elChkRemoveBold.checked);
        update();
      });
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
    if (elIn && elOut) {
      const rm = elChkRemoveBold?.checked || false;
      elOut.textContent = previewConverted(elIn.value, mapToProfile(to), rm);
    }
    setStatus(`To: ${to}`);
  });

  // Presets removed for a cleaner UI


  elBtn?.addEventListener('click', async () => {
    try {
      elBtn.disabled = true;
      setStatus('Working…');
      const p = mapToProfile(elSelTo?.value || 'obsidian');
      const rm = elChkRemoveBold?.checked || false;
      const sel = await getSelectionFromPage();
      const t0 = performance.now();
      const before = detect(sel);
      const converted = previewConverted(sel, p, rm);
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
      const rm = elChkRemoveBold?.checked || false;
      // Read clipboard as text (prefer text/plain; fallback to readText)
      const text = await readClipboardText();
      if (!text || text.length === 0) {
        setStatus('Clipboard is empty or not text', false);
        return;
      }
      const t0 = performance.now();
      const before = detect(text);
      const out = previewConverted(text, p, rm);
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
  // Fallback: inject a page-scoped copy helper using a contentEditable div
  try {
    const tabId = await getActiveTabId();
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
      args: [html],
    });
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

import { convert, profiles } from 'texpatch-core';

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
  const elStatus = document.getElementById('status') as HTMLSpanElement;
  const elIn = document.getElementById('in') as HTMLTextAreaElement | null;
  const elOut = document.getElementById('out') as HTMLPreElement | null;
  const elSel = document.getElementById('selProfile') as HTMLSelectElement | null;
  const elAuto = document.getElementById('chkAuto') as HTMLInputElement | null;

  const getProfile = async (): Promise<keyof typeof profiles> => {
    return new Promise((resolve) => {
      chrome.storage.sync.get({ profile: 'katex' }, (res) => resolve(res.profile));
    });
  };
  const setProfile = async (p: keyof typeof profiles): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ profile: p }, () => resolve());
    });
  };

  const setStatus = (msg: string, ok = true) => {
    elStatus.textContent = msg;
    elStatus.style.color = ok ? '#2a7' : '#c33';
    if (msg) setTimeout(() => (elStatus.textContent = ''), 1500);
  };

  (async () => {
    const p = await getProfile();
    if (elSel) elSel.value = p as string;
    chrome.storage.sync.get({ auto: true }, (res) => {
      if (elAuto) elAuto.checked = Boolean(res.auto);
    });
    if (elIn && elOut) {
      const update = () => {
        elOut.textContent = previewConverted(elIn.value, p);
      };
      elIn.addEventListener('input', update);
      update();
    }
  })();

  elSel?.addEventListener('change', async () => {
    const p = (elSel.value || 'katex') as keyof typeof profiles;
    await setProfile(p);
    if (elIn && elOut) elOut.textContent = previewConverted(elIn.value, p);
    setStatus(`Profile: ${p}`);
  });

  elAuto?.addEventListener('change', async () => {
    const enabled = Boolean(elAuto.checked);
    await new Promise<void>((resolve) => chrome.storage.sync.set({ auto: enabled }, () => resolve()));
    setStatus(enabled ? 'Auto on' : 'Auto off');
  });

  elBtn?.addEventListener('click', async () => {
    try {
      elBtn.disabled = true;
      setStatus('Working…');
      const p = (elSel?.value || 'katex') as keyof typeof profiles;
      const sel = await getSelectionFromPage();
      const converted = previewConverted(sel, p);
      await navigator.clipboard.writeText(converted);
      setStatus('Copied');
    } catch (e: any) {
      setStatus(e?.message || String(e), false);
    } finally {
      elBtn.disabled = false;
    }
  });
}

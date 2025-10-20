import { convert, profiles } from 'texpatch-core';

let currentProfile: keyof typeof profiles = 'katex';
let auto = true;

function loadSettings() {
  chrome.storage.sync.get({ profile: 'katex', auto: true }, (res) => {
    currentProfile = (res.profile || 'katex') as keyof typeof profiles;
    auto = Boolean(res.auto);
  });
}

loadSettings();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.profile) currentProfile = (changes.profile.newValue || 'katex') as keyof typeof profiles;
  if (changes.auto) auto = Boolean(changes.auto.newValue);
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

document.addEventListener('copy', (e) => {
  try {
    if (!auto) return;
    const text = getSelectedText();
    if (!text) return;
    const out = convert(text, { profile: currentProfile });
    if (!e.clipboardData) return;
    e.clipboardData.setData('text/plain', out);
    // Optional: also set HTML to the same plain text to avoid mismatches
    e.clipboardData.setData('text/html', out.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    e.preventDefault();
  } catch {
    // Swallow errors to avoid breaking native copy behavior
  }
}, true);


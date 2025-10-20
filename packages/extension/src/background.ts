chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({ id: 'texpatch-copy', title: 'Copy converted', contexts: ['selection'] });
  } catch {}
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'texpatch-copy' || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'COPY_CONVERTED' });
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'copy-converted' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'COPY_CONVERTED' });
  }
});


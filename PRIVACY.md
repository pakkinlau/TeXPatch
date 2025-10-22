Privacy Policy — TeXPatch

Summary
- TeXPatch works entirely locally in your browser. It does not send your content to any server.
- The extension reads your current page selection or clipboard only when you trigger a conversion, and writes the converted text back to your clipboard.
- The extension stores only your format preferences (e.g., profile and target) and UI options in chrome.storage.sync.

Data handling
- Selection access: Read once on user action (popup button, context menu, or keyboard shortcut) to obtain the currently selected text for conversion.
- Clipboard: When you click “Convert clipboard”, the extension reads text/plain from your clipboard and writes the converted output as both plain text and HTML (for rich‑paste targets). No additional data is retained.
- Storage: Saves non‑content settings in chrome.storage.sync (e.g., `from`, `to`, `profile`, and the optional “remove bold” toggle) to persist your preferences across devices. No page content or clipboard contents are stored.

Permissions rationale
- activeTab: Interact with the current tab only after a user gesture (e.g., reading selection text or writing clipboard output).
- scripting: Execute a short, page‑scoped script to read `window.getSelection()` from the active tab when you use the popup.
- storage: Persist non‑content preferences (`from`, `to`, `profile`, `removeBold`).
- clipboardRead: Read the clipboard only when you click “Convert clipboard”.
- clipboardWrite: Write the converted result to the clipboard after you trigger conversion.
- contextMenus: Add a “Copy converted” option to the right‑click menu for selected text.
- Host permissions: Allow a small content script to run on pages where you may convert selections so clipboard writes work reliably across sites. The script only reads the text you select when requested and performs all work locally.

Network usage
- None. TeXPatch makes no network requests and does not transmit any user data.

Contact
- Please open an issue in the repository if you have questions or concerns.

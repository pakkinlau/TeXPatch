Privacy Policy — TeXPatch

Summary
- TeXPatch operates entirely locally. It does not send your content to any server.
- The Chrome extension reads the current page selection only when you click its button and writes the converted text to your clipboard.
- The extension stores only your selected profile preference (e.g., "katex") in chrome.storage.sync.

Data handling
- Selection access: 
  - Manual mode: Read once on user action (button click in popup).
  - Auto mode: Intercepts the page’s copy event and replaces clipboard text with the converted result (still user‑initiated via copy).
- Clipboard: Uses the browser clipboard API to write the converted text. No additional data is retained.
- Storage: Saves the chosen profile name in chrome.storage.sync to persist your preference across devices.

Permissions rationale
- activeTab: Required to interact with the current tab upon user action.
- scripting: Used to run short, page-scoped functions to read/replace selection only after you click the button.
- storage: Used solely to persist the profile preference.
- clipboardWrite: Enables reliable clipboard writes from the popup.

Network usage
- None. TeXPatch does not perform any network requests.

Contact
- Please open an issue in the repository if you have questions or concerns.

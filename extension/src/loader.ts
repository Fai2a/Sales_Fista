/**
 * LeadVault — ESM Loader for Manifest V3
 * This script is loaded by Chrome as a regular script and then
 * dynamically imports the actual content script as a module.
 */
(async () => {
  try {
    const src = chrome.runtime.getURL('content.js');
    await import(src);
    console.log('[LeadVault] ESM Content Script loaded via Loader.');
  } catch (err) {
    console.error('[LeadVault] ESM Loader failed to import module:', err);
  }
})();

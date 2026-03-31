/**
 * LeadVault — ESM Loader for Manifest V3
 * This is a RAW JS file (in public/) to ensure Vite does not transform it into a module.
 * It is injected as a standard content script and dynamically imports the actual module.
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

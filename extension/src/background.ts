import { DASHBOARD_API_URL, DASHBOARD_API_KEY } from './config';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║ LeadVault — Hardened Background Service Worker (MV3)            ║
 * ║ Idempotent, stateless, and resilient against worker restarts.   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const log = (...args: any[]) =>
  console.log(`[LeadVault BG][${new Date().toLocaleTimeString()}]`, ...args);

// ─── Lifecycle ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  log(`Service Worker installed (${details.reason})`);
});

// ─── Port Connection Handler ──────────────────────────────────────────────────
/**
 * Handles persistent Port connections from content scripts and popup.
 * Each connection is identified with a unique ID for traceability.
 * The background worker is ephemeral in MV3 — do NOT store connection state
 * in module-level variables. All state must go to storage if persistence needed.
 */
chrome.runtime.onConnect.addListener((port) => {
  const portId = `${port.name}#${Date.now()}`;
  log(`Port connected: ${portId}`);

  port.onMessage.addListener(async (msg) => {
    try {
      log(`[${portId}] Message received: ${msg.action}`);

      if (msg.action === 'SAVE_LEAD') {
        if (msg.data) {
          await handleSaveLead(port, portId, msg.data);
        } else {
          log(`[${portId}] SAVE_LEAD failed: Missing data payload.`);
          safeSend(port, { action: 'SAVE_LEAD_RESPONSE', success: false, error: 'Malformed payload' });
        }
      }
    } catch (err) {
      log(`[${portId}] Critical error handling port message:`, err);
    }
  });

  port.onDisconnect.addListener(() => {
    const reason = chrome.runtime.lastError?.message ?? 'Client disconnected';
    log(`Port disconnected: ${portId}. Reason: ${reason}`);
  });
});

// ─── Lead Save Handler ────────────────────────────────────────────────────────
/**
 * Sends lead data to the Next.js backend with retry logic.
 * Implements exponential backoff for transient network failures.
 */
async function handleSaveLead(
  port: chrome.runtime.Port,
  portId: string,
  data: any,
  attempt = 1
): Promise<void> {
  const MAX_RETRIES = 3;

  if (!data) {
    log(`[${portId}] SAVE_LEAD rejected: empty payload.`);
    safeSend(port, { action: 'SAVE_LEAD_RESPONSE', success: false, error: 'Empty payload' });
    return;
  }

  log(`[${portId}] Attempting to save lead: ${data.name} (attempt ${attempt}/${MAX_RETRIES})`);

  try {
    const response = await fetch(DASHBOARD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': DASHBOARD_API_KEY,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const resData = await response.json();
    log(`[${portId}] Lead saved successfully: ${data.name}`);
    safeSend(port, { action: 'SAVE_LEAD_RESPONSE', success: true, data: resData });

  } catch (err: any) {
    let errorMessage = err.message;
    
    // Try to extract detailed error from response body if it was a fetch error
    if (err.message.includes('HTTP')) {
      try {
        const errorDetail = JSON.parse(err.message.split(':').slice(1).join(':').trim());
        errorMessage = errorDetail.error || errorDetail.detail || errorMessage;
      } catch { }
    }

    log(`[${portId}] Save failed (attempt ${attempt}): ${errorMessage}`);

    if (attempt < MAX_RETRIES) {
      const retryDelay = 1000 * 2 ** (attempt - 1); // 1s, 2s, 4s
      log(`[${portId}] Retrying in ${retryDelay}ms...`);
      setTimeout(() => handleSaveLead(port, portId, data, attempt + 1), retryDelay);
    } else {
      log(`[${portId}] Max retries reached. Lead save aborted.`);
      safeSend(port, { action: 'SAVE_LEAD_RESPONSE', success: false, error: errorMessage });
    }
  }
}

/**
 * Safely send a message via Port.
 * Swallows errors if the Port has already been closed.
 */
function safeSend(port: chrome.runtime.Port, msg: any): void {
  try {
    port.postMessage(msg);
  } catch (err) {
    log(`Port already closed before response could be sent.`);
  }
}

// ─── SPA Navigation Tracker ───────────────────────────────────────────────────
/**
 * Listens for LinkedIn SPA navigations via the webNavigation API.
 * On profile URL change, clears stale lead storage from the previous profile.
 * The content script also performs this cleanup locally, this is a redundant safeguard.
 */
if (chrome.webNavigation) {
  chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.url.includes('linkedin.com/in/')) {
      log(`SPA Navigation detected: ${details.url}`);
      chrome.storage.local.remove('profile', () => {
        log('Stale lead state cleared after navigation.');
      });
    }
  });
}

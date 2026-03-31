import { DASHBOARD_API_URL, DASHBOARD_API_KEY } from './config';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║ LeadVault — Hardened Background Service Worker (v2)               ║
 * ║ ⚡ Payload Logging | Error Propagation | SPA Lifecycle Guard     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const log = (...args: any[]) =>
  console.log(`%c[LeadVault BG][${new Date().toLocaleTimeString()}]`, 'color: #3b82f6; font-weight: bold;', ...args);

// ─── Lifecycle ────────────────────────────────────────────────────────────────
console.log("Background module loaded");

chrome.runtime.onInstalled.addListener((details) => {
  log(`Service Worker installed (${details.reason})`);
});

// ─── Port Connection Handler ──────────────────────────────────────────────────

chrome.runtime.onConnect.addListener((port) => {
  const portId = `${port.name}#${Date.now()}`;
  log(`Port connected: ${portId}`);

  port.onMessage.addListener(async (msg) => {
    try {
      if (msg.action === 'SAVE_LEAD') {
        if (msg.data) {
          log(`[${portId}] Incoming lead for saving:`, msg.data.name);
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

  log(`[${portId}] Sending payload to Dashboard (Attempt ${attempt}/${MAX_RETRIES}):`, {
    name: data.name,
    company: data.company,
    headline: data.headline,
    url: data.linkedin_url
  });

  try {
    const response = await fetch(DASHBOARD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': DASHBOARD_API_KEY,
      },
      body: JSON.stringify(data),
    });

    const resText = await response.text();
    let resData;
    try { resData = JSON.parse(resText); } catch { resData = { error: resText }; }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        log(`[${portId}] Auth Failed (Status ${response.status}). Check x-api-key.`);
        safeSend(port, { action: 'SAVE_LEAD_RESPONSE', success: false, error: 'Authentication failed. Please check extension configuration.' });
        return; // Do not retry on auth failure
      }
      throw new Error(`API ${response.status}: ${resData.message || resData.error || 'Unknown error'}`);
    }

    log(`[${portId}] Lead saved successfully: ${data.name}`);
    safeSend(port, { action: 'SAVE_LEAD_RESPONSE', success: true, data: resData });

  } catch (err: any) {
    const errorMsg = err.message || 'Unknown network error';
    log(`[${portId}] Save failed: ${errorMsg}`);

    if (attempt < MAX_RETRIES && !errorMsg.includes('API 4')) {
      const retryDelay = 1000 * Math.pow(2, attempt - 1);
      log(`[${portId}] Retrying in ${retryDelay}ms...`);
      setTimeout(() => handleSaveLead(port, portId, data, attempt + 1), retryDelay);
    } else {
      log(`[${portId}] Aborting save. ${attempt >= MAX_RETRIES ? 'Max retries reached.' : 'Client error.'}`);
      safeSend(port, { action: 'SAVE_LEAD_RESPONSE', success: false, error: errorMsg });
    }
  }
}

/**
 * Safely send a message via Port.
 */
function safeSend(port: chrome.runtime.Port, msg: any): void {
  try {
    port.postMessage(msg);
  } catch (err) {
    // Port closed, ignore
  }
}

// ─── SPA Navigation Tracker ───────────────────────────────────────────────────

if (chrome.webNavigation) {
  chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.url.includes('linkedin.com/in/')) {
      log(`SPA Navigation detected: ${details.url}`);
      chrome.storage.local.remove(['profile', 'active_profile_email'], () => {
        log('Stale lead state cleared.');
        // Notify content script if needed (optional since content script also monitors URLs)
      });
    }
  });
}

// Service worker for the LeadVault Extension
import { DASHBOARD_API_URL } from './config';


chrome.runtime.onInstalled.addListener(() => {
  console.log("LeadVault Extension Installed successfully.");
});

// Main message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  if (message.action === 'SAVE_LEAD') {
    saveLeadToDashboard(message.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => {
        console.error("Save error:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

// SPA Navigation Detection for LinkedIn (Task 3)
if (chrome.webNavigation) {
  chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.url.includes('linkedin.com/in/')) {
      chrome.tabs.sendMessage(details.tabId, { action: 'SPA_NAVIGATED', url: details.url });
    }
  });
} else {
  console.warn("LeadVault: chrome.webNavigation API is not available. SPA navigation detection disabled.");
}

// ── Save to Dashboard ────────────────────────────────────────────────────────

async function saveLeadToDashboard(leadData: any) {
  const response = await fetch(DASHBOARD_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dashboard error: ${errorText}`);
  }

  return response.json();
}

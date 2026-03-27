"use strict";
(() => {
  // src/background.ts
  chrome.runtime.onInstalled.addListener(() => {
    console.log("LeadVault Extension Installed successfully.");
  });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "SAVE_LEAD") {
      saveLeadToDashboard(message.data).then((response) => {
        sendResponse({ success: true, data: response });
      }).catch((error) => {
        console.error("Save error:", error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
  });
  async function saveLeadToDashboard(leadData) {
    const API_URL = "http://localhost:3000/api/leads";
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(leadData)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dashboard error: ${errorText}`);
    }
    return response.json();
  }
})();

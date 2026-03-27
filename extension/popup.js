"use strict";
(() => {
  // src/popup.ts
  var statusBadge = document.getElementById("status-badge");
  var contentArea = document.getElementById("content-area");
  var actionArea = document.getElementById("action-area");
  var saveBtn = document.getElementById("save-btn");
  var viewDashboardBtn = document.getElementById("view-dashboard-btn");
  var emailBtn = document.getElementById("access-email-btn");
  var phoneBtn = document.getElementById("access-phone-btn");
  var emailResult = document.getElementById("email-result");
  var phoneResult = document.getElementById("phone-result");
  var toast = document.getElementById("toast");
  var scrapedLeadData = null;
  var currentTabId = null;
  var DASHBOARD_URL = "http://localhost:3000";
  function showToast(message, isError = false) {
    toast.textContent = message;
    toast.className = `absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-0 opacity-100 transition-all duration-300 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap z-50 shadow-lg ${isError ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30"}`;
    setTimeout(() => {
      toast.classList.replace("translate-y-0", "translate-y-[150%]");
      toast.classList.replace("opacity-100", "opacity-0");
    }, 3e3);
  }
  function renderLeadCard(data) {
    scrapedLeadData = data;
    statusBadge.textContent = "LinkedIn Profile \u2713";
    statusBadge.className = "px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-green-500/20 text-green-400 border border-green-500/30 transition-colors";
    contentArea.innerHTML = `
    <div class="glass-card w-full p-4 flex flex-col items-center animate-[fade-in_0.3s_ease-out]">
      <h2 class="font-heading text-xl font-bold text-white text-center leading-tight mb-1">${data.name}</h2>
      <p class="text-sm text-blue-400 font-medium text-center mb-1">${data.designation}</p>
      <p class="text-xs text-slate-400 text-center mb-4">${data.company} • ${data.location}</p>
      
      <div class="w-full space-y-2 mt-1">
        ${data.email ? `
        <div class="flex items-center gap-3 bg-slate-800/60 p-2 rounded-md border border-slate-700/50">
          <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          <span class="text-xs text-slate-300 truncate">${data.email}</span>
        </div>` : ""}
        ${data.phone ? `
        <div class="flex items-center gap-3 bg-slate-800/60 p-2 rounded-md border border-slate-700/50">
          <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
          <span class="text-xs text-slate-300 truncate">${data.phone}</span>
        </div>` : ""}
      </div>
    </div>
  `;
    contentArea.classList.replace("opacity-0", "opacity-100");
    actionArea.classList.remove("hidden");
    chrome.storage.local.get(["scraped_email", "scraped_phone"], (res) => {
      if (res.scraped_email) {
        if (scrapedLeadData) scrapedLeadData.email = res.scraped_email;
        emailResult.textContent = `Email: ${res.scraped_email}`;
      }
      if (res.scraped_phone) {
        if (scrapedLeadData) scrapedLeadData.phone = res.scraped_phone;
        phoneResult.textContent = `Phone: ${res.scraped_phone}`;
      }
    });
  }
  function renderErrorState() {
    statusBadge.textContent = "Not a Profile \u2717";
    statusBadge.className = "px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-red-500/20 text-red-400 border border-red-500/30 transition-colors";
    contentArea.innerHTML = `
    <div class="flex flex-col items-center text-center px-4 animate-[fade-in_0.3s_ease-out]">
      <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </div>
      <h3 class="font-heading text-lg font-bold text-white mb-2">Not a LinkedIn Profile</h3>
      <p class="text-xs text-slate-400">Please navigate to a LinkedIn user profile page to extract lead data.</p>
    </div>
  `;
    contentArea.classList.replace("opacity-0", "opacity-100");
  }
  async function extractEmail() {
    if (!currentTabId) return;
    const originalHtml = emailBtn.innerHTML;
    emailBtn.innerHTML = `<svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Accessing...`;
    chrome.tabs.sendMessage(currentTabId, { action: "EXTRACT_EMAIL" }, (response) => {
      emailBtn.innerHTML = originalHtml;
      if (response && response.success && response.data) {
        if (scrapedLeadData) scrapedLeadData.email = response.data;
        emailResult.textContent = `Email: ${response.data}`;
        showToast("Email accessed successfully!");
      } else {
        emailResult.textContent = `Email: Not available`;
      }
    });
  }
  async function extractPhone() {
    if (!currentTabId) return;
    const originalHtml = phoneBtn.innerHTML;
    phoneBtn.innerHTML = `<svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Accessing...`;
    chrome.tabs.sendMessage(currentTabId, { action: "EXTRACT_PHONE" }, (response) => {
      phoneBtn.innerHTML = originalHtml;
      if (response && response.success && response.data) {
        if (scrapedLeadData) scrapedLeadData.phone = response.data;
        phoneResult.textContent = `Phone: ${response.data}`;
        showToast("Phone accessed successfully!");
      } else {
        phoneResult.textContent = `Phone: Not available`;
      }
    });
  }
  emailBtn.addEventListener("click", extractEmail);
  phoneBtn.addEventListener("click", extractPhone);
  async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab.id || null;
    chrome.storage.local.remove(["scraped_email", "scraped_phone"]);
    if (tab.url?.includes("linkedin.com/in/")) {
      // Show name immediately if available from title
      const title = tab.title || "";
      const nameMatch = title.split("|")[0].trim().replace(/^\(\d+\)\s*/, "");
      if (nameMatch && nameMatch !== "LinkedIn") {
        contentArea.innerHTML = `
          <div class="animate-pulse flex flex-col items-center w-full px-4">
            <div class="w-20 h-20 rounded-full border-2 border-gold/30 border-t-gold animate-spin mb-4"></div>
            <h2 class="font-heading text-xl font-bold text-white text-center leading-tight mb-1">${nameMatch}</h2>
            <p class="text-sm text-slate-400 font-medium">Scanning Profile...</p>
          </div>
        `;
        contentArea.classList.replace("opacity-0", "opacity-100");
      }

      chrome.tabs.sendMessage(tab.id, { action: "SCRAPE_PROFILE" }, (response) => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          }).then(() => {
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: "SCRAPE_PROFILE" }, (retryResponse) => {
                if (retryResponse?.data) renderLeadCard(retryResponse.data);
                else renderErrorState();
              });
            }, 1e3);
          });
        } else if (response && response.data) {
          renderLeadCard(response.data);
        } else {
          renderErrorState();
        }
      });
    } else {
      renderErrorState();
    }
  }
  saveBtn.addEventListener("click", async () => {
    if (!scrapedLeadData) return;
    const originalHtml = saveBtn.innerHTML;
    saveBtn.innerHTML = `<div class="relative px-4 py-3 bg-gradient-to-r from-gold to-yellow-500 rounded-md transition-all"><span class="flex items-center justify-center gap-2 text-base font-bold text-navy"><svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...</span></div>`;
    saveBtn.disabled = true;
    chrome.runtime.sendMessage({ action: "SAVE_LEAD", data: scrapedLeadData }, (response) => {
      saveBtn.innerHTML = originalHtml;
      saveBtn.disabled = false;
      if (response && response.success) {
        showToast("Lead saved to Vault successfully!");
      } else {
        showToast(response?.error || "Failed to save lead", true);
      }
    });
  });
  viewDashboardBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: DASHBOARD_URL });
  });
  document.addEventListener("DOMContentLoaded", init);
})();

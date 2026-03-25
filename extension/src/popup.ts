import type { LeadData } from './types';

// Popup UI Elements
const statusBadge = document.getElementById('status-badge') as HTMLDivElement;
const contentArea = document.getElementById('content-area') as HTMLDivElement;
const actionArea = document.getElementById('action-area') as HTMLDivElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const viewDashboardBtn = document.getElementById('view-dashboard-btn') as HTMLButtonElement;
const emailBtn = document.getElementById('access-email-btn') as HTMLButtonElement;
const phoneBtn = document.getElementById('access-phone-btn') as HTMLButtonElement;
const toast = document.getElementById('toast') as HTMLDivElement;

let scrapedLeadData: LeadData | null = null;
let currentTabId: number | null = null;

const DASHBOARD_URL = 'http://localhost:3000';

function showToast(message: string, isError = false) {
  toast.textContent = message;
  toast.className = `absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-0 opacity-100 transition-all duration-300 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap z-50 shadow-lg ${
    isError ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'
  }`;
  setTimeout(() => {
    toast.classList.replace('translate-y-0', 'translate-y-[150%]');
    toast.classList.replace('opacity-100', 'opacity-0');
  }, 3000);
}

function renderLeadCard(data: LeadData) {
  scrapedLeadData = data;
  
  statusBadge.textContent = 'LinkedIn Profile ✓';
  statusBadge.className = 'px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-green-500/20 text-green-400 border border-green-500/30 transition-colors';

  contentArea.innerHTML = `
    <div class="glass-card w-full p-3 flex flex-col items-center animate-[fade-in_0.3s_ease-out]">
      <div class="relative mb-2">
        <div class="absolute inset-0 rounded-full bg-gold/50 blur-md scale-110 animate-pulse"></div>
        <img src="${data.photoUrl || 'https://via.placeholder.com/150'}" alt="Profile" class="w-20 h-20 rounded-full border-2 border-gold relative z-10 object-cover" />
      </div>
      <h2 class="font-heading text-lg font-bold text-white text-center leading-tight mb-1">${data.name}</h2>
      <p class="text-xs text-blue-400 font-medium text-center mb-1">${data.designation}</p>
      <p class="text-[11px] text-slate-400 text-center mb-3">${data.company} • ${data.location}</p>
      
      <div class="w-full space-y-2 mt-1">
        ${data.email ? `
        <div class="flex items-center gap-3 bg-slate-800/60 p-2 rounded-md border border-slate-700/50">
          <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          <span class="text-xs text-slate-300 truncate">${data.email}</span>
        </div>` : ''}
        ${data.phone ? `
        <div class="flex items-center gap-3 bg-slate-800/60 p-2 rounded-md border border-slate-700/50">
          <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
          <span class="text-xs text-slate-300 truncate">${data.phone}</span>
        </div>` : ''}
      </div>
    </div>
  `;
  
  contentArea.classList.replace('opacity-0', 'opacity-100');
  actionArea.classList.remove('hidden');

  // Disable buttons if already accessed
  if (data.email) {
    emailBtn.disabled = true;
    emailBtn.className = "w-full px-3 py-2 rounded-lg text-xs font-bold text-slate-400 bg-slate-800 border border-slate-700 cursor-not-allowed flex items-center justify-center gap-1";
    emailBtn.innerHTML = `✓ Email Found`;
  }
  if (data.phone) {
    phoneBtn.disabled = true;
    phoneBtn.className = "w-full px-3 py-2 rounded-lg text-xs font-bold text-slate-400 bg-slate-800 border border-slate-700 cursor-not-allowed flex items-center justify-center gap-1";
    phoneBtn.innerHTML = `✓ Phone Found`;
  }
}

function renderErrorState() {
  statusBadge.textContent = 'Not a Profile ✗';
  statusBadge.className = 'px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-red-500/20 text-red-400 border border-red-500/30 transition-colors';

  contentArea.innerHTML = `
    <div class="flex flex-col items-center text-center px-4 animate-[fade-in_0.3s_ease-out]">
      <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </div>
      <h3 class="font-heading text-lg font-bold text-white mb-2">Not a LinkedIn Profile</h3>
      <p class="text-xs text-slate-400">Please navigate to a LinkedIn user profile page to extract lead data.</p>
    </div>
  `;
  contentArea.classList.replace('opacity-0', 'opacity-100');
}

async function fetchContactInfo() {
  if (!currentTabId) return;
  emailBtn.innerHTML = `<svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Accessing...`;
  phoneBtn.innerHTML = `<svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Accessing...`;
  
  chrome.tabs.sendMessage(currentTabId, { action: 'SCRAPE_CONTACT_INFO' }, (response: any) => {
    if (response && response.data) {
      if (scrapedLeadData) {
        scrapedLeadData.email = response.data.email || scrapedLeadData.email;
        scrapedLeadData.phone = response.data.phone || scrapedLeadData.phone;
        renderLeadCard(scrapedLeadData);
        showToast('Contact info accessed successfully!');
      }
    } else {
      showToast('Contact info not found or visible.', true);
      // reset text
      if (!scrapedLeadData?.email) emailBtn.innerHTML = `Access Email`;
      if (!scrapedLeadData?.phone) phoneBtn.innerHTML = `Access Phone`;
    }
  });
}

emailBtn.addEventListener('click', fetchContactInfo);
phoneBtn.addEventListener('click', fetchContactInfo);

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id || null;
  
  if (tab.url?.includes('linkedin.com/in/')) {
    chrome.tabs.sendMessage(tab.id!, { action: 'SCRAPE_PROFILE' }, (response: any) => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          files: ['src/content.js']
        }).then(() => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id!, { action: 'SCRAPE_PROFILE' }, (retryResponse: any) => {
              if (retryResponse?.data) renderLeadCard(retryResponse.data);
              else renderErrorState();
            });
          }, 1000);
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

saveBtn.addEventListener('click', async () => {
  if (!scrapedLeadData) return;
  
  const originalHtml = saveBtn.innerHTML;
  saveBtn.innerHTML = `<div class="relative px-4 py-3 bg-gradient-to-r from-gold to-yellow-500 rounded-md transition-all"><span class="flex items-center justify-center gap-2 text-base font-bold text-navy"><svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...</span></div>`;
  saveBtn.disabled = true;

  try {
    const res = await fetch(`${DASHBOARD_URL}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(scrapedLeadData)
    });

    if (res.ok) {
      showToast('Lead saved to Vault successfully!');
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to save lead', true);
    }
  } catch (error: any) {
    showToast('Network error: Is dashboard running?', true);
  } finally {
    saveBtn.innerHTML = originalHtml;
    saveBtn.disabled = false;
  }
});

viewDashboardBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: DASHBOARD_URL });
});

document.addEventListener('DOMContentLoaded', init);

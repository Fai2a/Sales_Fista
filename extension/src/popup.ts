import type { LeadData } from './types';

// ── DOM Elements ─────────────────────────────────────────────────────────────
const statusBadge     = document.getElementById('status-badge')       as HTMLElement;
const profileHeader   = document.getElementById('profile-header')     as HTMLElement;
const profileName     = document.getElementById('profile-name')       as HTMLElement;
const profileHeadline = document.getElementById('profile-headline')   as HTMLElement;
const scanState       = document.getElementById('scan-state')         as HTMLElement;
const scanName        = document.getElementById('scan-name')          as HTMLElement;
const scanLabel       = document.getElementById('scan-label')         as HTMLElement;
const emailResult     = document.getElementById('email-result')       as HTMLElement;
const emailText       = document.getElementById('email-text')         as HTMLElement;
const phoneResult     = document.getElementById('phone-result')       as HTMLElement;
const phoneText       = document.getElementById('phone-text')         as HTMLElement;
const errorState      = document.getElementById('error-state')        as HTMLElement;
const errorMsg        = document.getElementById('error-msg')          as HTMLElement;
const actionArea      = document.getElementById('action-area')        as HTMLElement;
const saveBtn         = document.getElementById('save-btn')           as HTMLButtonElement;
const viewDashBtn     = document.getElementById('view-dashboard-btn') as HTMLButtonElement;
const accessEmailBtn  = document.getElementById('access-email-btn')  as HTMLButtonElement;
const accessPhoneBtn  = document.getElementById('access-phone-btn')  as HTMLButtonElement;
const toast           = document.getElementById('toast')              as HTMLElement;

// ── State ─────────────────────────────────────────────────────────────────────
let scrapedLeadData: LeadData | null = null;
const DASHBOARD_URL = 'http://localhost:3000';


// ── Helpers ───────────────────────────────────────────────────────────────────
function show(el: HTMLElement) { el.classList.add('visible'); el.classList.remove('hidden'); }
function hide(el: HTMLElement) { el.classList.remove('visible'); el.classList.add('hidden'); }

function showToast(message: string, isError = false) {
  toast.textContent = message;
  toast.className = `show ${isError ? 'error' : 'success'}`;
  setTimeout(() => { toast.className = ''; }, 3400);
}

function setBadge(text: string, color: 'green' | 'red' | 'yellow' | 'default') {
  statusBadge.textContent = text;
  const colors: Record<string, string> = {
    green:  'rgba(52,211,153,0.4)',
    red:    'rgba(248,113,113,0.4)',
    yellow: 'rgba(251,191,36,0.4)',
    default:'',
  };
  const text_colors: Record<string, string> = {
    green: '#34d399', red: '#f87171', yellow: '#fbbf24', default: ''
  };
  statusBadge.style.borderColor = colors[color];
  statusBadge.style.color = text_colors[color];
}


function renderLeadCard(data: LeadData) {
  scrapedLeadData = data;
  setBadge('Profile Loaded ✓', 'green');

  profileName.textContent = data.name || '—';
  profileHeadline.textContent = data.designation || '';
  show(profileHeader);

  // Show email if found
  if (data.email) {
    emailText.textContent = data.email;
    show(emailResult);
  }

  // Show phone if found
  if (data.phone) {
    phoneText.textContent = data.phone;
    show(phoneResult);
  }

  hide(scanState);
  hide(errorState);
  show(actionArea);
}

// ── Error State ───────────────────────────────────────────────────────────────
function renderErrorState(message?: string) {
  setBadge('Error ✗', 'red');
  if (message && errorMsg) errorMsg.textContent = message;
  hide(scanState);
  hide(profileHeader);
  show(errorState);
}

// ── Messaging Helpers ────────────────────────────────────────────────────────
async function ensureContentScript(tabId: number): Promise<boolean> {
  try {
    // Try a ping to see if content script is already there
    await chrome.tabs.sendMessage(tabId, { action: 'PING' });
    return true;
  } catch (err) {
    // If it fails, inject the script manually
    console.log("Content script not found. Injecting manually...");
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      // Give it a small moment to initialize
      await new Promise(r => setTimeout(r, 150));
      return true;
    } catch (e) {
      console.error("Manual injection failed:", e);
      return false;
    }
  }
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab.url?.includes('linkedin.com/in/')) {
    hide(scanState);
    if (errorMsg) errorMsg.textContent = 'Navigate to a LinkedIn profile page to scrape data.';
    show(errorState);
    setBadge('Not a Profile', 'red');
    return;
  }

  // Ensure content script is ready before we start
  const scriptReady = await ensureContentScript(tab.id);
  if (!scriptReady) {
    renderErrorState('Could not initialize scraper. Please refresh the page.');
    return;
  }

  // Show name from tab title immediately
  const title = tab.title || '';
  const nameMatch = title.split('|')[0].trim().replace(/^\(\d+\)\s*/, '');
  if (nameMatch && nameMatch !== 'LinkedIn') {
    scanName.textContent = nameMatch;
  }
  if (scanLabel) scanLabel.textContent = 'Fetching profile via RapidAPI…';
  show(scanState);
  setBadge('Fetching…', 'yellow');

  // Send fetch request to background
  const linkedinUrl = tab.url!.split('?')[0];
  chrome.runtime.sendMessage(
      { action: 'FETCH_LINKEDIN_PROFILE', url: linkedinUrl },
      (response: any) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          renderErrorState('Extension communication error. Try refreshing.');
          return;
        }
        if (response?.success && response.data) {
          renderLeadCard(response.data);
        } else {
          const err = response?.error || 'Unknown error';
          if (err === 'NO_API_KEY') {
            renderErrorState('API key missing. Edit src/config.ts and rebuild.');
          } else if (err === 'INVALID_API_KEY') {
            renderErrorState('Invalid API key. Update src/config.ts and rebuild.');
          } else if (err === 'RATE_LIMITED') {
            renderErrorState('Rate limit reached. Please wait before trying again.');
          } else {
            renderErrorState(`API error: ${err}`);
          }
        }
      }
    );
}

// ── Access Email Button ───────────────────────────────────────────────────────
accessEmailBtn.addEventListener('click', async () => {
  const origLabel = accessEmailBtn.innerHTML;
  accessEmailBtn.innerHTML = 'Scanning profile…';
  accessEmailBtn.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_EMAIL' }, (response: any) => {
    accessEmailBtn.innerHTML = origLabel;
    accessEmailBtn.disabled = false;

    if (chrome.runtime.lastError) {
      showToast('Connection failed. Please refresh the tab.', true);
      return;
    }

    if (response?.success && response.data) {
      const found = response.data as string;
      emailText.textContent = found;
      show(emailResult);
      if (scrapedLeadData) scrapedLeadData.email = found;
      showToast('Email found: ' + found);
      accessEmailBtn.classList.add('hidden'); // Hide after success
    } else {
      showToast('Email not publicly available on this profile', true);
      emailText.textContent = 'Not listed';
      show(emailResult);
    }
  });
});

// ── Access Phone Button ───────────────────────────────────────────────────────
accessPhoneBtn.addEventListener('click', async () => {
  const origLabel = accessPhoneBtn.innerHTML;
  accessPhoneBtn.innerHTML = 'Scanning profile…';
  accessPhoneBtn.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PHONE' }, (response: any) => {
    accessPhoneBtn.innerHTML = origLabel;
    accessPhoneBtn.disabled = false;

    if (chrome.runtime.lastError) {
      showToast('Connection failed. Please refresh the tab.', true);
      return;
    }

    if (response?.success && response.data) {
      const found = response.data as string;
      phoneText.textContent = found;
      show(phoneResult);
      if (scrapedLeadData) scrapedLeadData.phone = found;
      showToast('Phone found: ' + found);
      accessPhoneBtn.classList.add('hidden'); // Hide after success
    } else {
      showToast('Phone not publicly available on this profile', true);
      phoneText.textContent = 'Not listed';
      show(phoneResult);
    }
  });
});

// ── Save Lead ─────────────────────────────────────────────────────────────────
saveBtn.addEventListener('click', async () => {
  if (!scrapedLeadData) return;
  const orig = saveBtn.innerHTML;
  saveBtn.innerHTML = 'Saving…';
  saveBtn.disabled = true;
  chrome.runtime.sendMessage({ action: 'SAVE_LEAD', data: scrapedLeadData }, (response: any) => {
    saveBtn.innerHTML = orig;
    saveBtn.disabled = false;
    if (chrome.runtime.lastError) {
        showToast('Communication error', true);
        return;
    }
    if (response?.success) showToast('Lead saved to Dashboard!');
    else showToast(response?.error || 'Save failed', true);
  });
});

viewDashBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: DASHBOARD_URL });
});

document.addEventListener('DOMContentLoaded', init);

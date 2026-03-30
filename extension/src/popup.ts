import type { LeadData } from './types';
import { VERBOSE_LOGGING } from './config';

/**
 * LeadVault — Reactive Popup (Hardened Flow)
 * Optimized for persistence and reliability via 'profile' key.
 */

function log(...args: any[]) { 
  if (VERBOSE_LOGGING) console.log(`[LeadVault][${new Date().toLocaleTimeString()}]`, ...args); 
}

// ── DOM Nodes ──────────────────────────────────────────────────────────────
const statusBadge     = document.getElementById('status-badge')       as HTMLElement;
const profileHeader   = document.getElementById('profile-header')     as HTMLElement;
const profileName     = document.getElementById('profile-name')       as HTMLElement;
const profileHeadline = document.getElementById('profile-headline')   as HTMLElement;
const profileCompany  = document.getElementById('profile-company')    as HTMLElement;
const profileLocation = document.getElementById('profile-location')   as HTMLElement;
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

// ── State Store ──────────────────────────────────────────────────────────────
let scrapedLeadData: LeadData | null = null;
const DASHBOARD_URL = 'http://localhost:3000';

// ── Port Management ──────────────────────────────────────────────────────────
let port: chrome.runtime.Port | null = null;
function connectToBackground() {
  try {
    port = chrome.runtime.connect({ name: 'LeadVault-Popup' });
    port.onMessage.addListener((res) => {
      try {
        if (res.action === 'SAVE_LEAD_RESPONSE') {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Lead';
          if (res.success) showToast('Lead archived to dashboard! ✓');
          else showToast(res.error || 'Archive failed.', true);
        }
      } catch (err) {
        log('Error in port message listener:', err);
      }
    });
    
    port.onDisconnect.addListener(() => { 
      log('[LeadVault] Background port disconnected. Reconnecting...');
      port = null; 
      // Handle early cleanup if needed
    });
  } catch (err) {
    log('Failed to connect to background worker:', err);
  }
}

function postSafeMessage(msg: any) {
  if (!port) connectToBackground();
  try { port?.postMessage(msg); } catch (e) { connectToBackground(); }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function show(el: HTMLElement) { el?.classList.add('visible'); el?.classList.remove('hidden'); }
function hide(el: HTMLElement) { el?.classList.remove('visible'); el?.classList.add('hidden'); }

function showToast(message: string, isError = false) {
  if (!toast) return;
  toast.textContent = message;
  toast.className = `show ${isError ? 'error' : 'success'}`;
  setTimeout(() => { toast.className = ''; }, 3400);
}

function setBadge(text: string, color: 'green' | 'red' | 'yellow' | 'default') {
  if (!statusBadge) return;
  statusBadge.textContent = text;
  const colors: Record<string, string> = { green: '#34d399', red: '#f87171', yellow: '#fbbf24', default: '' };
  statusBadge.style.color = colors[color] || '';
  statusBadge.style.borderColor = colors[color] ? `${colors[color]}66` : '';
}

// ── Rendering Engine ─────────────────────────────────────────────────────────
function renderLeadCard(data: LeadData | null | undefined, duration?: string) {
  log('UI Rendering update triggered...', data?.name || '(no data)');
  
  if (!data) {
    scrapedLeadData = null;
    hide(profileHeader);
    hide(actionArea);
    show(scanState);
    if (scanLabel) scanLabel.textContent = 'Waiting for profile extraction...';
    return;
  }

  scrapedLeadData = data;
  const name = data.name || 'Unknown';
  
  // Conditional UI States
  if (name === 'Unknown' || name === 'Not Available') {
    setBadge('Partial Data Found ⚠', 'yellow');
  } else {
    setBadge(duration ? `Synced in ${duration}s ✓` : 'Synced and Ready ✓', 'green');
  }

  if (profileName) profileName.textContent = name;
  if (profileHeadline) profileHeadline.textContent = data.headline || data.designation || 'Not Available';
  if (profileCompany) profileCompany.textContent = data.company || 'Not Available';
  if (profileLocation) profileLocation.textContent = data.location || 'Not Available';
  
  show(profileHeader);
  hide(scanState);
  hide(errorState);
  show(actionArea);

  // Email/Phone rendering
  if (data.email && data.email !== 'Not Available') {
    if (emailText) emailText.textContent = data.email;
    show(emailResult);
    accessEmailBtn?.classList.add('hidden');
  } else {
    hide(emailResult);
    accessEmailBtn?.classList.remove('hidden');
  }

  if (data.phone && data.phone !== 'Not Available') {
    if (phoneText) phoneText.textContent = data.phone;
    show(phoneResult);
    accessPhoneBtn?.classList.add('hidden');
  } else {
    hide(phoneResult);
    accessPhoneBtn?.classList.remove('hidden');
  }
}

function renderErrorState(message?: string) {
  setBadge('Operation Terminated ✗', 'red');
  if (message && errorMsg) errorMsg.textContent = message;
  hide(scanState);
  hide(profileHeader);
  show(errorState);
}

// ── Scraper Management ────────────────────────────────────────────────────────

async function ensureContentScriptReady(tabId: number, maxAttempts = 3): Promise<boolean> {
  log('Ensuring content script readiness...');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await new Promise<any>((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: 'PING' }, (r) => {
          if (chrome.runtime.lastError) resolve(null);
          else resolve(r);
        });
      });
      if (res?.alive) return true;
    } catch { }
    try { await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); } catch { }
    await new Promise(r => setTimeout(r, 400 * attempt));
  }
  return false;
}

async function triggerScrape(tabId: number, guessedName?: string) {
  log('Triggering profile scrape...');
  setBadge('Probing Profile…', 'yellow');
  show(scanState);
  if (scanLabel) scanLabel.textContent = 'Loading profile data...';

  const ready = await ensureContentScriptReady(tabId);
  if (!ready) {
    renderErrorState('Could not reach content script. Reload tab.');
    return;
  }

  chrome.tabs.sendMessage(tabId, { action: 'SCRAPE_PROFILE' }, (res) => {
    if (chrome.runtime.lastError) {
      log('Scrape message error:', chrome.runtime.lastError.message);
      renderErrorState('Scraper lost connection mid-scan.');
      return;
    }
    if (res?.success) {
      log('Scrape success received in Popup.');
      if (res.data.name === 'Unknown' && guessedName) res.data.name = guessedName;
      renderLeadCard(res.data, res.duration);
    }
  });
}

// ── Initializer ──────────────────────────────────────────────────────────────
async function init() {
  log('LeadVault initialized.');
  connectToBackground();

  // Reset UI and internal state immediately to prevent stale data flickers
  scrapedLeadData = null;
  setBadge('Probing Profile…', 'yellow');
  show(scanState);
  if (scanLabel) scanLabel.textContent = 'Checking for current profile...';
  hide(profileHeader);
  hide(actionArea);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.includes('linkedin.com/in/')) {
      renderErrorState('Extension only works on LinkedIn Profile pages.');
      return;
    }

    // Standardized Storage Keys: 'profile' and 'active_profile_email'
    log('Checking storage for cached profile and email...');
    chrome.storage.local.get(['profile', 'active_profile_email'], async (result) => {
      try {
        // Initialize with default empty object if nothing is found to prevent null pointer errors
        const storedLead = (result.profile || {}) as LeadData;
        const cachedEmail = result.active_profile_email as string | undefined;
        
        if (storedLead?.linkedin_url && tab.url?.includes(storedLead.linkedin_url)) {
          log('Restoring profile from storage:', storedLead.name);
          if (cachedEmail && storedLead) {
            log('Merging cached email into profile data.');
            storedLead.email = cachedEmail;
          }
          renderLeadCard(storedLead);
        } else {
          log('No cached profile matching current URL. Starting new scrape...');
          const title = tab.title || '';
          const namePrefix = title.split('|')[0].trim().replace(/^\(\d+\)\s*/, '');
          if (namePrefix && namePrefix !== 'LinkedIn' && scanName) scanName.textContent = namePrefix;
          triggerScrape(tab.id!, namePrefix);
        }
      } catch (err) {
        log('Error in storage callback handling:', err);
      }
    });

    // Reactive Watcher for 'profile' key
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.profile) return;
      log('Storage update detected (profile key). Re-rendering UI.');
      renderLeadCard(changes.profile.newValue as LeadData | null | undefined);
    });

  } catch (e) {
    log('Critical failure in init:', e);
    renderErrorState('Extension Context Error. Re-open extension.');
  }
}

// ── UI Events ────────────────────────────────────────────────────────────────
accessEmailBtn?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !scrapedLeadData) return;
  accessEmailBtn.disabled = true;
  accessEmailBtn.textContent = 'Scanning...';
  chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_EMAIL' }, (res) => {
    try {
      accessEmailBtn.disabled = false;
      accessEmailBtn.textContent = 'Access Email';
      if (chrome.runtime.lastError) {
        showToast('Connection lost.', true);
      } else if (res?.success && res.data) {
        log('Email extraction success. Syncing UI and Storage.');
        if (scrapedLeadData) {
          scrapedLeadData.email = res.data;
          chrome.storage.local.set({ active_profile_email: res.data });
          renderLeadCard(scrapedLeadData);
        } else {
          log('Extraction success but scrapedLeadData was null. Recovering...');
          const recovered = { email: res.data } as LeadData;
          chrome.storage.local.set({ active_profile_email: res.data });
          renderLeadCard(recovered);
        }
      } else {
        showToast('Email not found.', true);
      }
    } catch (err) {
      log('Error handling EXTRACT_EMAIL response:', err);
      showToast('Extraction failed early.', true);
    }
  });
});

accessPhoneBtn?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !scrapedLeadData) return;
  accessPhoneBtn.disabled = true;
  accessPhoneBtn.textContent = 'Scanning...';
  chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PHONE' }, (res) => {
    try {
      accessPhoneBtn.disabled = false;
      accessPhoneBtn.textContent = 'Access Phone';
      if (chrome.runtime.lastError) {
        showToast('Connection lost.', true);
      } else if (res?.success && res.data) {
        log('Phone extraction success. Syncing UI.');
        if (scrapedLeadData) {
          scrapedLeadData.phone = res.data;
          renderLeadCard(scrapedLeadData);
        }
      } else {
        showToast('Phone not found.', true);
      }
    } catch (err) {
      log('Error handling EXTRACT_PHONE response:', err);
    }
  });
});

saveBtn?.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!scrapedLeadData || !tab?.id) return;
    
    // Sanitize and fallback for mandatory linkedin_url
    const payload = {
      ...scrapedLeadData,
      linkedin_url: scrapedLeadData.linkedin_url || tab.url?.split('?')[0] || '',
      email: scrapedLeadData.email || '',
      name: scrapedLeadData.name || 'Unknown',
      headline: scrapedLeadData.headline || '',
      company: scrapedLeadData.company || '',
      designation: scrapedLeadData.designation || '',
      location: scrapedLeadData.location || '',
    };

    if (!payload.email) {
      showToast('Extraction required first.', true);
      return;
    }

    log('Saving lead to dashboard with sanitized payload...');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Forwarding...';
    postSafeMessage({ action: 'SAVE_LEAD', data: payload });
  } catch (err) {
    log('Critical error during Save Lead click:', err);
  }
});

viewDashBtn?.addEventListener('click', () => { chrome.tabs.create({ url: DASHBOARD_URL }); });

document.addEventListener('DOMContentLoaded', init);

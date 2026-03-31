import type { LeadData } from './types';
import { VERBOSE_LOGGING } from './config';

/**
 * LeadVault — Reactive Popup (Hardened Flow v5.3)
 * Optimized for persistence and zero-latency rendering.
 */

function log(...args: any[]) { 
  if (VERBOSE_LOGGING) console.log(`[LeadVault][${new Date().toLocaleTimeString()}]`, ...args); 
}

// ── DOM Nodes ──────────────────────────────────────────────────────────────
const statusBadge     = document.getElementById('status-badge')       as HTMLElement;
const profileHeader   = document.getElementById('profile-header')     as HTMLElement;
const profileName     = document.getElementById('profile-name')       as HTMLElement;
const profileHeadline = document.getElementById('profile-headline')   as HTMLElement;
const profileDesignation = document.getElementById('profile-designation') as HTMLElement;
const profileCompany  = document.getElementById('profile-company')    as HTMLElement;
const profileLocation = document.getElementById('profile-location')   as HTMLElement;
const profileLocationDot = document.getElementById('profile-location-dot') as HTMLElement;
const emailResult     = document.getElementById('email-result')       as HTMLElement;
const emailText       = document.getElementById('email-text')         as HTMLElement;
const phoneResult     = document.getElementById('phone-result')       as HTMLElement;
const phoneText       = document.getElementById('phone-text')         as HTMLElement;
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
      if (res.action === 'SAVE_LEAD_RESPONSE') {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          Save to Dashboard`;
        if (res.success) {
          console.log("Lead saved successfully");
          showToast('Lead saved successfully');
        } else {
          console.error("Failed to save lead:", res.error);
          showToast('Failed to save lead', true);
        }
      }
    });
  } catch (err) { log('Background connection failed.'); }
}

function postSafeMessage(msg: any) {
  if (!port) connectToBackground();
  try { port?.postMessage(msg); } catch (e) { connectToBackground(); }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function show(el: HTMLElement) { 
  if (!el) return;
  el.classList.remove('hidden'); 
  el.classList.add('visible'); 
  el.style.display = (el === profileName || el === profileHeadline) ? 'block' : 'flex'; 
}

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

function renderLeadCard(data: Partial<LeadData> | null | undefined) {
  if (!data) return;
  
  if (data.name && data.name !== 'Not Available' && data.name !== '—') {
    profileName.textContent = data.name;
    profileName.style.color = '#fff';
    show(profileName);
  } else {
    profileName.innerHTML = '<span class="skeleton skeleton-name"></span>';
  }

  if (data.headline && data.headline !== 'Not Available' && data.headline !== '—') {
    profileHeadline.textContent = data.headline;
    show(profileHeadline);
  } else {
    profileHeadline.innerHTML = '<span class="skeleton skeleton-text"></span>';
  }

  if (data.designation && data.designation !== 'Not Available') {
    profileDesignation.textContent = data.designation;
    show(profileDesignation);
  }

  if (data.company && data.company !== 'Not Available') {
    profileCompany.textContent = data.company;
    show(profileCompany);
  }

  if (data.location && data.location !== 'Not Available') {
    profileLocation.textContent = data.location;
    show(profileLocation);
    show(profileLocationDot);
  }

  // Persisted Email/Phone check
  if (data.email && data.email !== 'Not Available') {
    emailText.textContent = data.email;
    show(emailResult);
    accessEmailBtn.innerHTML = `✓ ${data.email}`;
    accessEmailBtn.disabled = true;
  }
  
  if (data.phone && data.phone !== 'Not Available') {
    phoneText.textContent = data.phone;
    show(phoneResult);
    accessPhoneBtn.innerHTML = `✓ ${data.phone}`;
    accessPhoneBtn.disabled = true;
  }

  show(profileHeader);
  show(actionArea);
  scrapedLeadData = data as LeadData;
}

// ── Scraper Management ────────────────────────────────────────────────────────

async function triggerScrape(tabId: number) {
  setBadge('Probing…', 'yellow');
  try {
    chrome.tabs.sendMessage(tabId, { action: 'SCRAPE_PROFILE' }, (res) => {
      if (chrome.runtime.lastError) {
        setBadge('Offline', 'red');
        return;
      }
      
      if (!res?.success) {
        log(`Scrape rejected: ${res?.error}`);
        setBadge('Failed', 'red');
        profileName.innerHTML = `<span style="color: #f87171; font-size:14px;">Extraction Failed: ${res?.error || 'Name missing'}</span>`;
        profileHeadline.innerHTML = '';
        saveBtn.disabled = true;
        return;
      }

      saveBtn.disabled = false;
      renderLeadCard(res.data);
      setBadge('Online ✓', 'green');
    });
  } catch (err) { setBadge('Error', 'red'); }
}

// ── Initializer ──────────────────────────────────────────────────────────────

async function init() {
  log('LeadVault initialized.');
  connectToBackground();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes('linkedin.com/in/')) {
    setBadge('Invalid Page', 'red');
    profileName.textContent = 'Non-Profile Tab';
    return;
  }

  // 1. Instant Render from Cache
  chrome.storage.local.get(['active_profile', 'profile'], (res) => {
    const activeCache = res.active_profile as Partial<LeadData> | undefined;
    const fullProfile = res.profile as LeadData | undefined;

    // Use active_profile (name/headline) for instant population
    if (activeCache?.name && activeCache.name !== 'Not Available' && activeCache.name !== '—') {
      renderLeadCard(activeCache);
    } else {
      // Fallback to skeleton if no cache
      renderLeadCard({ name: '', headline: '' });
    }

    // 2. If URLs match, load the full record
    if (fullProfile?.linkedin_url && tab.url?.includes(fullProfile.linkedin_url)) {
      renderLeadCard(fullProfile);
    }
    
    // 3. Always trigger a fresh background scrape to ensure data is current
    triggerScrape(tab.id!);
  });
}

// ── UI Events ────────────────────────────────────────────────────────────────

accessEmailBtn?.addEventListener('click', async () => {
  console.log("Email button clicked");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  
  accessEmailBtn.disabled = true;
  accessEmailBtn.innerHTML = '<div class="scan-spinner"></div> Fetching email...';

  chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_EMAIL' }, (res) => {
    if (res?.success && res.data && res.data !== 'Not Available') {
      const emailValue = res.data;
      console.log(`Email extracted: ${emailValue}`);
      emailText.textContent = emailValue;
      show(emailResult);
      accessEmailBtn.innerHTML = `Email found: ${emailValue}`;
      accessEmailBtn.style.background = 'rgba(52,211,153,0.1)';
      accessEmailBtn.style.borderColor = 'var(--green)';
      accessEmailBtn.style.color = 'var(--green)';
      
      if (scrapedLeadData) {
        scrapedLeadData.email = emailValue;
      }
      // Keep cache active for immediate reload
      chrome.storage.local.get(['active_profile'], (s) => {
        const currentActive = s.active_profile as Partial<LeadData> || {};
        chrome.storage.local.set({ 
          active_profile: { ...currentActive, email: emailValue } 
        });
      });
      navigator.clipboard.writeText(res.data);
      showToast('Email extracted and copied!');
    } else {
      accessEmailBtn.innerHTML = 'Not Found';
      accessEmailBtn.disabled = false;
      showToast('Email not found on profile.', true);
    }
  });
});

accessPhoneBtn?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  
  accessPhoneBtn.disabled = true;
  accessPhoneBtn.innerHTML = '<div class="scan-spinner"></div> Scanning...';

  chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PHONE' }, (res) => {
    if (res?.success && res.data && res.data !== 'Not Available') {
      phoneText.textContent = res.data;
      show(phoneResult);
      accessPhoneBtn.innerHTML = `✓ ${res.data}`;
      if (scrapedLeadData) scrapedLeadData.phone = res.data;
      navigator.clipboard.writeText(res.data);
      showToast('Phone copied to clipboard!');
    } else {
      accessPhoneBtn.innerHTML = 'Not Found';
      accessPhoneBtn.disabled = false;
      showToast('Phone not found.', true);
    }
  });
});

saveBtn?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !scrapedLeadData) {
    console.error("Failed to save lead: No data loaded in UI");
    showToast("Failed to save lead", true);
    return;
  }
  
  saveBtn.disabled = true;
  saveBtn.textContent = 'Archiving...';

  const safeStr = (val: any) => (typeof val === 'string' && val.trim() !== '' && val !== '—') ? val : 'Not Available';

  let finalName = safeStr(scrapedLeadData.name);
  if (finalName === 'Not Available' || finalName.length < 2) {
    console.warn("Missing required field: name (Using fallback)");
    finalName = 'Unknown';
  }

  const lead = {
    name:           finalName,
    headline:       safeStr(scrapedLeadData.headline),
    company:        safeStr(scrapedLeadData.company),
    location:       safeStr(scrapedLeadData.location || scrapedLeadData.city),
    designation:    safeStr(scrapedLeadData.designation),
    email:          safeStr(scrapedLeadData.email),
    phone:          safeStr(scrapedLeadData.phone),
    linkedin_url:   scrapedLeadData.linkedin_url || tab.url?.split('?')[0] || '',
    saved_at:       new Date().toISOString(),
    profile_image:  scrapedLeadData.profile_image || '',
    connectionCount:scrapedLeadData.connectionCount || '0',
    bio:            scrapedLeadData.bio || '',
    skills:         scrapedLeadData.skills || []
  };

  if (!lead.linkedin_url) {
    console.error('[LeadVault] Cannot save — missing required linkedin_url');
    showToast(`Failed to save lead: Missing URL`, true);
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save to Dashboard';
    return;
  }

  console.log("Lead to save:", lead);
  console.log("Sending lead to backend...");
  postSafeMessage({ action: 'SAVE_LEAD', data: lead });
});

viewDashBtn?.addEventListener('click', () => { chrome.tabs.create({ url: DASHBOARD_URL }); });

document.addEventListener('DOMContentLoaded', init);

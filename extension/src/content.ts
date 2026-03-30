import type { LeadData } from './types';
import { VERBOSE_LOGGING } from './config';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║ LeadVault — High-Performance Scraper Engine (Stabilized)          ║
 * ║ ⚡ SPA-Aware | Guarded Init | Auto-Cleanup | 2s Settle Delay     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

declare global {
  interface Window {
    __LEADVAULT_INITIALIZED__?: boolean;
    __LISTENER_ADDED__?: boolean;
    __NAV_INTERVAL__?: any;
    __OBSERVER__?: MutationObserver | null;
  }
}

const log = (...args: any[]) =>
  VERBOSE_LOGGING && console.log(`[LeadVault][${new Date().toLocaleTimeString()}]`, ...args);

// ─── 1. Robust Wait Mechanism ────────────────────────────────────────────────

async function waitForElement(selector: string, timeout = 10000): Promise<Element | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = document.querySelector(selector);
    if (el) return el;
    await new Promise(res => setTimeout(res, 500));
  }
  return null;
}

// ─── 2. Bulletproof Scraping Logic ─────────────────────────────────────────────

async function scrapeProfile(): Promise<LeadData> {
  log('Starting hardened profile extraction...');

  // Name (Multi-selector fallback)
  const nameEl = await waitForElement('h1.text-heading-xlarge') || 
                 document.querySelector('[class*="text-heading-xlarge"]') ||
                 document.querySelector('h1');
  const name = nameEl?.textContent?.trim() || 'Unknown';
  
  // Headline
  const headlineEl = document.querySelector('[class*="text-body-medium"]') || 
                     document.querySelector('.pv-text-details__left-panel h2');
  const headline = headlineEl?.textContent?.trim() || 'Not Available';

  // Location
  const locationEl = document.querySelector('[class*="pv-text-details__left-panel"] [class*="text-body-small"]') ||
                     document.querySelector('.pv-text-details__left-panel span.text-body-small');
  const location = locationEl?.textContent?.trim() || 'Not Available';

  // Contacts
  const contacts = await getContacts();

  // Experience Section
  let company = 'Not Available';
  let designation = headline; 

  const expSection = document.querySelector('#experience') || 
                     document.querySelector('section[id*="experience"]') ||
                     document.querySelector('.experience-section');
  
  if (expSection) {
    const firstItem = expSection.nextElementSibling?.querySelector('li') || 
                     expSection.querySelector('li') ||
                     document.querySelector('.pv-profile-section__list-item');
    
    if (firstItem) {
      const spans = Array.from(firstItem.querySelectorAll('span[aria-hidden="true"]'));
      designation = spans[0]?.textContent?.trim() || designation;
      company = (spans[1]?.textContent?.trim() || '').split('·')[0].trim();
    }
  }

  const payload: LeadData = {
    name,
    headline,
    company: company || 'Not Available',
    location: location || 'Not Available',
    city: (location || '').split(',')[0].trim(),
    designation: designation || 'Not Available',
    linkedin_url: window.location.href.split('?')[0],
    profile_image: document.querySelector('img.pv-top-card-profile-picture__image')?.getAttribute('src') || '',
    connectionCount: '0',
    bio: '',
    skills: [],
    email: contacts.email,
    phone: contacts.phone
  };

  log('[LeadVault] Final Scraped Payload:', payload);
  return payload;
}

// ─── 3. SPA Navigation & Cleanup ─────────────────────────────────────────────

function cleanup() {
  if (window.__NAV_INTERVAL__) {
    log('Cleaning up navigation interval...');
    clearInterval(window.__NAV_INTERVAL__);
    window.__NAV_INTERVAL__ = null;
  }
  if (window.__OBSERVER__) {
    log('Cleaning up mutation observer...');
    window.__OBSERVER__.disconnect();
    window.__OBSERVER__ = null;
  }
}

function initScraper() {
  log('Initializing scraper engine...');
  
  // URL Watcher for SPA Navigation
  let lastUrl = location.href;
  window.__NAV_INTERVAL__ = setInterval(() => {
    if (location.href !== lastUrl) {
      const isProfile = location.href.includes('/in/');
      
      lastUrl = location.href;
      
      if (isProfile) {
        log('[LeadVault] Navigation detected. Reseting state...');
        
        // Reset current tracking
        cleanup();
        
        // Clear storage to prevent stale data flickers in UI
        chrome.storage.local.remove('profile');
        chrome.storage.local.remove('active_profile_email');

        // Delayed re-init after 2s settle time as requested
        setTimeout(() => {
          initScraper();
          scrapeProfile().then(data => {
            if (chrome.runtime?.id) chrome.storage.local.set({ profile: data });
          });
        }, 2000);
      }
    }
  }, 1000);
}

// ─── 4. Initialization Guard ──────────────────────────────────────────────────

if (window.__LEADVAULT_INITIALIZED__) {
  log('Already initialized, skipping re-injection...');
} else {
  window.__LEADVAULT_INITIALIZED__ = true;
  initScraper();
}

// ─── 5. Message Listener Guard ───────────────────────────────────────────────

if (!window.__LISTENER_ADDED__) {
  window.__LISTENER_ADDED__ = true;
  
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    try {
      if (request.action === 'PING') { sendResponse({ alive: true }); return false; }

      if (request.action === 'SCRAPE_PROFILE') {
        scrapeProfile()
          .then(data => sendResponse({ success: true, data, duration: 'N/A' }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }
      
      if (request.action === 'EXTRACT_EMAIL' || request.action === 'EXTRACT_PHONE') {
        const type = request.action === 'EXTRACT_EMAIL' ? 'email' : 'phone';
        getContacts()
          .then(res => sendResponse({ success: !!res[type], data: res[type] }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }
    } catch (err) {
      log('Critical Error in onMessage listener:', err);
      sendResponse({ success: false, error: 'Internal content script error' });
    }
    return false;
  });
}

// ─── Contact Info ────────────────────────────────────────────────────────────

async function getContacts(): Promise<{ email: string; phone: string }> {
  try {
    const contactLink = document.querySelector('a#top-card-text-details-contact-info, a[href*="/overlay/contact-info/"]') as HTMLAnchorElement;
    if (!contactLink) return { email: '', phone: '' };

    contactLink.click();
    await waitForElement('.pv-contact-info');

    const email = document.querySelector('a[href^="mailto:"]')?.textContent?.trim() || '';
    let phone = document.querySelector('a[href^="tel:"]')?.textContent?.trim() || '';
    
    if (!phone) {
      const phoneSec = Array.from(document.querySelectorAll('section')).find(s => s.innerText.toLowerCase().includes('phone'));
      phone = phoneSec?.querySelector('span')?.innerText.trim() || '';
    }

    (document.querySelector('button[aria-label="Dismiss"]') as HTMLButtonElement)?.click();
    return { email, phone };
  } catch {
    return { email: '', phone: '' };
  }
}

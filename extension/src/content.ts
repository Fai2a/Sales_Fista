import axios from 'axios';
import type { LeadData } from './types';
import { DASHBOARD_API_KEY } from './config';

/**
 * LeadVault — Hardened Scraper Engine (v5.2)
 * Bulletproof DOM Scraping | Regex Contact Extraction | Async Persistence
 */

declare global {
  interface Window {
    __LEADVAULT_INITIALIZED__?: boolean;
    __LISTENER_ADDED__?: boolean;
    __NAV_WATCHER__?: any;
    __LAST_WATCHED_URL__?: string;
  }
}

// ─── 1. Context Safety Guard ──────────────────────────────────────────────────

function isContextValid(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

const log = (...args: any[]) => {
  if (!isContextValid()) return;
  console.log(`%c[LeadVault][${new Date().toLocaleTimeString()}]`, 'color: #10b981; font-weight: bold;', ...args);
};

function safeChromeCall<T>(fn: () => T): T | null {
  if (!isContextValid()) return null;
  try {
    return fn();
  } catch (err: any) {
    if (err.message?.includes('context invalidated')) {
      console.warn('[LeadVault] Extension context invalidated. Cleaning up script...');
      cleanup();
    }
    return null;
  }
}

function cleanup() {
  if (window.__NAV_WATCHER__) clearInterval(window.__NAV_WATCHER__);
  window.__LEADVAULT_INITIALIZED__ = false;
}

// ─── 2. Core Utilities ────────────────────────────────────────────────────────

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

function sanitizeField(value: string | null | undefined): string {
  if (!value) return 'Not Available';
  let clean = value.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^\d+$/.test(clean)) return 'Not Available'; 
  return clean || 'Not Available';
}

async function waitForElement(selector: string, timeout = 10000): Promise<HTMLElement | null> {
  if (!isContextValid()) return null;
  return new Promise((resolve) => {
    const interval = 300;
    let elapsed = 0;

    const timer = setInterval(() => {
      if (!isContextValid()) {
        clearInterval(timer);
        return resolve(null);
      }
      const el = document.querySelector(selector) as HTMLElement;
      if (el && el.innerText && el.innerText.trim().length > 0) {
        clearInterval(timer);
        resolve(el);
      }
      
      elapsed += interval;
      if (elapsed >= timeout) {
        clearInterval(timer);
        resolve(null);
      }
    }, interval);
  });
}

// ─── 3. Bulletproof Scraping Engine ───────────────────────────────────────────

async function scrapeProfile(): Promise<LeadData> {
  log('Scraping core profile fields...');

  // Set explicitly via runFullScrapePipe which handles primary extraction logic
  const nameEl = document.querySelector('h1.text-heading-xlarge, .pv-text-details__left-panel h1, h1') as HTMLElement;
  const name = 'Unknown';

  // Strategy: Targeted sibling or specific class for Headline
  const headlineEl = 
    document.querySelector('.text-body-medium.break-words') || 
    document.querySelector('[data-test-id="headline"]') ||
    nameEl?.closest('.pv-text-details__left-panel')?.querySelector('.text-body-medium') ||
    document.querySelector('h1 + div');
  const headline = sanitizeField(headlineEl?.textContent);

  // Secondary fields (using robust fallbacks)
  const location = sanitizeField(
    document.querySelector('.text-body-small.inline.t-black--light.break-words')?.textContent ||
    document.querySelector('[data-test-id="location-text"]')?.textContent ||
    document.querySelector('.pb2 .text-body-small')?.textContent
  );

  const company = sanitizeField(
    document.querySelector('.pv-text-details__right-panel .hoverable-link-text span')?.textContent ||
    document.querySelector('[aria-label*="Current company"] span')?.textContent ||
    document.querySelector('#experience')?.nextElementSibling?.querySelector('.t-bold span[aria-hidden="true"]')?.textContent
  );

  const designation = sanitizeField(
    document.querySelector('#experience')?.nextElementSibling?.querySelector('.t-bold span[aria-hidden="true"]')?.textContent ||
    headline
  );

  const leadData: LeadData = {
    name,
    headline,
    company,
    location,
    city: location.split(',')[0].trim(),
    designation,
    linkedin_url: window.location.href.split('?')[0],
    profile_image: document.querySelector('img.pv-top-card-profile-picture__image')?.getAttribute('src') || '',
    connectionCount: '0',
    bio: '',
    skills: [],
    email: 'Not Available',
    phone: 'Not Available'
  };

  // Cache name and headline immediately for instant popup rendering
  safeChromeCall(() => {
    chrome.storage.local.set({ 
      active_profile: { name, headline }
    });
  });

  return leadData;
}

/**
 * 4-Tier Strategy for contact extraction (Bulletproof Regex Fallback)
 */
async function extractEmail(): Promise<string> {
  log('Bulletproof Email Extraction Flow Initiated...');
  try {
    // 1. Check if contact info modal link exists and click it IF NOT already in overlay
    if (!window.location.href.includes('/overlay/contact-info/')) {
      const contactLink = document.querySelector('a[href*="overlay/contact-info"]') as HTMLElement;
      if (contactLink) {
        contactLink.click();
        await waitForElement('.pv-contact-info, .artdeco-modal', 4000);
        await wait(500); // Allow modal hydration
      }
    }

    // Strategy 1 — Direct mailto link anywhere in document
    const mailtoLink = document.querySelector('a[href^="mailto:"]');
    const email1 = mailtoLink?.getAttribute('href')?.replace('mailto:', '').trim();
    if (email1) return sanitizeField(email1);

    // Strategy 2 — Contact info section link text
    const email2 = document.querySelector('.pv-contact-info__contact-type a')?.textContent?.trim();
    if (email2 && email2.includes('@')) return sanitizeField(email2);

    // Strategy 3 — Any anchor whose text contains @ symbol
    const allLinks = Array.from(document.querySelectorAll('a'));
    const email3 = allLinks.find(a => a.textContent?.includes('@'))?.textContent?.trim();
    if (email3) return sanitizeField(email3);

    // Strategy 4 — BROAD Regex sweep of document.body.innerText
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const bodyText = document.body.innerText;
    const email4 = bodyText.match(emailRegex)?.[0];
    if (email4) return sanitizeField(email4);

    return 'Not Available';
  } catch (err) {
    log('Extraction exception:', err);
    return 'Not Available';
  } finally {
    // Auto-dismiss modal
    (document.querySelector('button[aria-label="Dismiss"]') as HTMLElement)?.click();
  }
}

async function extractPhone(): Promise<string> {
  log('Extracting phone from modal...');
  try {
    const phoneEl = document.querySelector('.ci-phone span.t-14') || 
                    document.querySelector('.pv-contact-info__contact-type span');
    if (phoneEl && !phoneEl.textContent?.includes('@')) {
      return sanitizeField(phoneEl.textContent);
    }
    return 'Not Available';
  } catch { return 'Not Available'; }
}

// ─── 4. Pipeline Logic ───────────────────────────────────────────────────────

async function runFullScrapePipe() {
  if (!isContextValid()) return { success: false, error: 'Context invalidated' };
  
  const currentUrl = window.location.href.split('?')[0];
  const cacheKey = `profile_cache_${currentUrl}`;

  // 1. Cache Check (Value Validation)
  const cached = await new Promise<any>((resolve) => {
    chrome.storage.local.get([cacheKey], (res) => resolve(res[cacheKey]));
  });

  if (cached && (Date.now() - cached.timestamp < 10 * 60 * 1000)) {
    const data = cached.data;
    if (data.name && data.name !== 'Not Available' && data.name.length >= 2 && data.name !== '—') {
      log('Loading from valid 10-min cache.');
      chrome.storage.local.set({ profile: data });
      return { success: true, data };
    }
  }
  
  // 2. High-Speed Scrape with Tolerance
  log('Starting profile data extraction...');
  
  let extractedName = 'Unknown';
  let attempt = 0;
  const MAX_RETRIES = 4; // Max ~2.0 seconds execution
  
  while (attempt < MAX_RETRIES) {
    if (!isContextValid()) return { success: false, error: 'Context invalidated' };
    log('Attempting to extract name...');
    
    let nameEl = (
      document.querySelector('h1.text-heading-xlarge') || 
      document.querySelector('.pv-text-details__left-panel h1') || 
      document.querySelector('h1[class*="text-heading"]') ||
      document.querySelector('[data-test-id="inline-name"]')
    ) as HTMLElement;
    
    if (!nameEl) {
      const allH1s = Array.from(document.querySelectorAll('h1'));
      nameEl = allH1s.find(h1 => h1.textContent && h1.textContent.trim().length > 1 && !h1.textContent.includes('LinkedIn')) as HTMLElement;
    }

    const testStr = sanitizeField(nameEl?.innerText || nameEl?.textContent);
    if (testStr && testStr.length >= 2 && testStr !== 'Not Available') {
      extractedName = testStr;
      log(`Name found: ${extractedName}`);
      break;
    }
    
    log(`Retrying name extraction... (${attempt + 1}/${MAX_RETRIES})`);
    await wait(500); 
    attempt++;
  }

  // 3. Fallbacks
  if (extractedName === 'Unknown' || extractedName === 'Not Available') {
    log('Failed to extract name from DOM, attempting fallbacks...');
    
    if (document.title && document.title.includes(' | LinkedIn')) {
      const titleName = document.title.split(' | LinkedIn')[0].trim();
      if (titleName && titleName.length >= 2 && !titleName.includes('(')) { // Avoid unparsed notification counts e.g. "(12) LinkedIn"
         extractedName = sanitizeField(titleName);
         log(`Fallback name used`);
      }
    }
    
    // Meta OG Title
    if ((extractedName === 'Unknown' || extractedName === 'Not Available') && document.querySelector('meta[property="og:title"]')) {
      const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.split(' | LinkedIn')[0].trim();
      if (metaContent && metaContent.length >= 2) {
         extractedName = sanitizeField(metaContent);
         log(`Fallback name used`);
      }
    }
    
    if (extractedName === 'Unknown' || extractedName === 'Not Available') {
       extractedName = 'Unknown';
       log('Ultimate fallback used. Setting name to "Unknown"');
    }
  }

  // Proceed cleanly down pipeline with whatever data gathered
  const leadData = await scrapeProfile();
  leadData.name = extractedName;

  // 3. Store and Sync ONLY if valid
  safeChromeCall(() => {
    chrome.storage.local.set({ 
      profile: leadData,
      [cacheKey]: { data: leadData, timestamp: Date.now() }
    });
  });

  try {
    await axios.post('http://localhost:3000/api/leads', leadData, {
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': DASHBOARD_API_KEY
      }
    });
    log('Synced to backend.');
  } catch (err) { log('Backend sync skipped/failed.'); }

  log('Scrape pipeline completed successfully.');
  return { success: true, data: leadData };
}

// ─── 5. Messaging & Lifecycle (CRITICAL RETURN TRUE) ─────────────────────────

if (!window.__LISTENER_ADDED__) {
  window.__LISTENER_ADDED__ = true;
  safeChromeCall(() => {
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      if (!isContextValid()) return false;

      log(`Incoming message: ${request.action}`);

      if (request.action === 'PING') {
        sendResponse({ status: 'READY', alive: true });
        return true; 
      } 
      
      if (request.action === 'SCRAPE_PROFILE') {
        runFullScrapePipe().then((res) => {
          if (res && res.success) {
            sendResponse({ success: true, data: res.data });
          } else {
            sendResponse({ success: false, error: res?.error || 'Unknown Error' });
          }
        });
        return true; // Keep channel open for async response
      } 
      
      if (request.action === 'EXTRACT_EMAIL') {
        extractEmail().then((data) => sendResponse({ success: true, data }));
        return true; // Keep channel open
      } 
      
      if (request.action === 'EXTRACT_PHONE') {
        extractPhone().then((data) => sendResponse({ success: true, data }));
        return true; // Keep channel open
      }
      
      return false;
    });
  });
}

function init() {
  if (window.__LEADVAULT_INITIALIZED__) return;
  window.__LEADVAULT_INITIALIZED__ = true;
  window.__LAST_WATCHED_URL__ = location.href;

  log('Mounting SPA MutationObserver for strict URL tracking...');
  // Transform to strictly use MutationObserver on document as requested
  new MutationObserver(() => {
    if (!isContextValid()) return cleanup();
    if (location.href !== window.__LAST_WATCHED_URL__) {
      log('SPA Navigation detected. Wiping previous profile state.');
      window.__LAST_WATCHED_URL__ = location.href;
      
      // Reset state on each new profile
      safeChromeCall(() => chrome.storage.local.remove(['profile', 'active_profile']));
      
      if (location.href.includes('/in/')) {
        runFullScrapePipe(); // startScraping
      }
    }
  }).observe(document, { subtree: true, childList: true });

  if (location.href.includes('/in/')) runFullScrapePipe();
}

safeChromeCall(() => init());

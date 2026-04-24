import axios from 'axios';
import type { LeadData } from './types';
import { DASHBOARD_API_KEY } from './config';
import { enrichProfile } from './enrichment/enrichment';
import { extractLinkedInContactInfo } from './enrichment/contactExtractor';

console.log("Content script running");

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

import { isContextValid, log, wait, sanitizeField, safeChromeCall, cleanup } from './content-utils';

// ─── 3. Bulletproof Scraping Engine ───────────────────────────────────────────

async function scrapeProfile(): Promise<LeadData> {
  log('Scraping core profile fields...');

  // Set explicitly via runFullScrapePipe which handles primary extraction logic
  const nameEl = (
    document.querySelector('h1.text-heading-xlarge') || 
    document.querySelector('.pv-text-details__left-panel h1') || 
    document.querySelector('h1[class*="text-heading"]') ||
    document.querySelector('[data-test-id="inline-name"]')
  ) as HTMLElement;
  const name = sanitizeField(nameEl?.innerText || nameEl?.textContent) || 'Unknown';

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
    city: location ? location.split(',')[0].trim() : null,
    designation,
    linkedin_url: window.location.href.split('?')[0],
    profile_image: document.querySelector('img.pv-top-card-profile-picture__image')?.getAttribute('src') || null,
    connectionCount: '0',
    bio: '',
    skills: [],
    email: null,
    phone: null
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
// Note: extractEmail logic moved to contactExtractor.ts and enrichment.ts pipeline

async function extractPhone(): Promise<string | null> {
  log('Extracting phone from modal...');
  try {
    const phoneEl = document.querySelector('.ci-phone span.t-14') || 
                    document.querySelector('.pv-contact-info__contact-type span');
    if (phoneEl && !phoneEl.textContent?.includes('@')) {
      return sanitizeField(phoneEl.textContent);
    }
    return null;
  } catch { return null; }
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
    if (testStr && testStr.length >= 2) {
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
      const titleName = sanitizeField(document.title.split(' | LinkedIn')[0].trim());
      if (titleName && titleName.length >= 2 && !titleName.includes('(')) { // Avoid unparsed notification counts e.g. "(12) LinkedIn"
         extractedName = titleName;
         log(`Fallback name used`);
      }
    }
    
    // Meta OG Title
    if ((extractedName === 'Unknown' || extractedName === 'Not Available') && document.querySelector('meta[property="og:title"]')) {
      const metaContent = sanitizeField(document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.split(' | LinkedIn')[0].trim());
      if (metaContent && metaContent.length >= 2) {
         extractedName = metaContent;
         log(`Fallback name used`);
      }
    }
    
    if (extractedName === 'Unknown' || extractedName === 'Not Available') {
       extractedName = 'Unknown';
       log('Ultimate fallback used. Setting name to "Unknown"');
    }
  }

  // 3. Proceed cleanly down pipeline with whatever data gathered
  const leadData = await scrapeProfile();
  leadData.name = extractedName;

  // Update active profile cache for popup consistency
  safeChromeCall(() => {
    chrome.storage.local.set({ 
      active_profile: { name: leadData.name, headline: leadData.headline }
    });
  });

  // 4. Unified Priority Enrichment Layer (Contact Info -> Website -> Public)
  log('Triggering unified enrichment pipeline...');
  try {
    const enrichment = await enrichProfile({
      fullName: leadData.name,
      companyName: leadData.company || 'Unknown',
      jobTitle: leadData.designation || 'Unknown',
      location: leadData.location || 'Unknown',
      linkedinUrl: leadData.linkedin_url
    });

    if (enrichment && enrichment.email) {
      log(`Enrichment successful! Found: ${enrichment.email} via ${enrichment.source} (${enrichment.confidence})`);
      leadData.email = enrichment.email;
      leadData.enrichment = enrichment;
    } else {
      log('Enrichment pipeline returned no results. Email set to NULL.');
      leadData.email = null;
      leadData.enrichment = enrichment; // This will contain the null structure
    }
  } catch (err) {
    log('Enrichment pipeline error:', err);
  }

  // 5. Store and Sync ONLY if valid
  safeChromeCall(() => {
    chrome.storage.local.set({ 
      profile: leadData,
      [cacheKey]: { data: leadData, timestamp: Date.now() }
    });
  });

  try {
    await axios.post('http://localhost:3001/api/leads', leadData, {
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

      console.log("Message received in content script:", request);
      log(`Incoming message action: ${request.action || request.type}`);

      if (request.action === 'PING' || request.type === 'PING') {
        sendResponse({ status: 'READY', alive: true });
        return true; 
      } 
      
      if (request.action === 'SCRAPE_PROFILE' || request.type === 'SCRAPE_PROFILE') {
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
        extractLinkedInContactInfo().then((info) => sendResponse({ success: true, data: info.email }));
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

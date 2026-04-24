import type { EnrichmentResult } from '../types';
import type { ExtractedEmail } from './emailExtractor';
import { scrapeGitHub } from './sourceScrapers/github';
import { scrapeCompanyWebsite } from './sourceScrapers/website';
import { scrapePortfolio } from './sourceScrapers/portfolio';
import { extractLinkedInContactInfo } from './contactExtractor';
import { log } from '../content-utils';

interface ProfileIdentifiers {
  fullName: string;
  companyName: string;
  jobTitle: string;
  location: string;
  linkedinUrl: string;
}

import { generateEmailPatterns } from './patternGenerator';

export async function enrichProfile(identifiers: ProfileIdentifiers): Promise<EnrichmentResult> {
  const { fullName, linkedinUrl, companyName } = identifiers;
  
  // 0. Check Cache
  const cacheKey = `enrichment_cache_${linkedinUrl}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  log(`[LeadVault] Starting priority enrichment for ${fullName}...`);

  // STEP 1: Check LinkedIn Contact Info (Email + Website)
  const contactInfo = await extractLinkedInContactInfo();
  
  if (contactInfo.email) {
    log('Email found directly in LinkedIn Contact Info.');
    const result: EnrichmentResult = {
      email: contactInfo.email,
      source: 'LinkedIn',
      confidence: 'High'
    };
    await saveToCache(cacheKey, result);
    return result;
  }

  // Identify Domain for Step 2 and Step 4
  let domain = contactInfo.website ? new URL(contactInfo.website).hostname.replace('www.', '') : null;
  if (!domain && companyName && companyName !== 'Unknown') {
    // Simple inference if website missing (per spec 5.2 Domain Extraction)
    domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
  }

  // STEP 2: Strict Company Website Scraping
  if (contactInfo.website) {
    log(`Company website found: ${contactInfo.website}. Starting strict scrape...`);
    const websiteEmails = await scrapeCompanyWebsite(contactInfo.website, fullName);
    const bestWebsiteEmail = websiteEmails[0]; 
    
    if (bestWebsiteEmail && (bestWebsiteEmail.confidence === 'high' || bestWebsiteEmail.confidence === 'medium')) {
      const result: EnrichmentResult = {
        email: bestWebsiteEmail.email,
        source: 'Company Website',
        confidence: bestWebsiteEmail.confidence === 'high' ? 'High' : 'Medium'
      };
      await saveToCache(cacheKey, result);
      return result;
    }
  }

  // STEP 3: Public Enrichment (GitHub + Portfolio)
  log('Proceeding to public source enrichment...');
  const scrapers = [
    scrapeGitHub(fullName),
    scrapePortfolio(fullName)
  ];

  const results = await Promise.allSettled(scrapers);
  const allEmails: ExtractedEmail[] = [];
  results.forEach(res => {
    if (res.status === 'fulfilled') {
      allEmails.push(...res.value);
    }
  });

  const bestEmail = allEmails.sort((a, b) => {
    const scores: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return scores[b.confidence] - scores[a.confidence];
  })[0];

  if (bestEmail && (bestEmail.confidence === 'high' || bestEmail.confidence === 'medium')) {
    const finalResult: EnrichmentResult = {
      email: bestEmail.email,
      source: bestEmail.source,
      confidence: bestEmail.confidence === 'high' ? 'High' : 'Medium'
    };
    await saveToCache(cacheKey, finalResult);
    return finalResult;
  }

  // STEP 4: Pattern Generation (Spec v1.0 - Section 5.2)
  if (domain) {
    log(`Attempting pattern generation for domain: ${domain}...`);
    const patterns = generateEmailPatterns(fullName, domain);
    const bestPattern = patterns[0]; // first.last@domain.com or similar

    if (bestPattern) {
      log(`Pattern generated: ${bestPattern.email}`);
      const result: EnrichmentResult = {
        email: bestPattern.email,
        source: 'Pattern Prediction',
        confidence: 'Low'
      };
      await saveToCache(cacheKey, result);
      return result;
    }
  }

  // STEP 5: NULL Return
  log('No email found across all sources.');
  return {
    email: null,
    source: null,
    confidence: null
  };
}

async function getFromCache(key: string): Promise<EnrichmentResult | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (res: { [key: string]: any }) => {
      const data = res[key];
      if (data && (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000)) { // 7 days cache
        resolve(data.result);
      } else {
        resolve(null);
      }
    });
  });
}

async function saveToCache(key: string, result: EnrichmentResult) {
  return new Promise<void>((resolve) => {
    chrome.storage.local.set({
      [key]: { result, timestamp: Date.now() }
    }, () => resolve());
  });
}

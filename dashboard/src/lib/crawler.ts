/**
 * LeadVault Web Crawler & Contact Extractor
 * Implements strict extraction of publicly visible contact details from company websites.
 */

interface ContactMatch {
  value: string;
  source_url: string;
  confidence: 'High' | 'Medium' | 'Low';
}

interface CrawlResult {
  company_domain: string;
  emails: ContactMatch[];
  phone_numbers: ContactMatch[];
}

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_PATTERN = /\+?[0-9][0-9\s\-\(\)]{7,}/g;

/**
 * Normalizes common email obfuscations
 */
function normalizeContent(text: string): string {
  return text
    .replace(/\s*\[at\]\s*|\s*\(at\)\s*|\s+at\s+/gi, '@')
    .replace(/\s*\[dot\]\s*|\s*\(dot\)\s*|\s+dot\s+/gi, '.')
    .replace(/\s+/g, ' ');
}

/**
 * Extracts emails and phone numbers from raw HTML content
 */
function extractFromHtml(html: string, url: string, isContactPage: boolean): { emails: ContactMatch[], phones: ContactMatch[] } {
  // Strip script, style, and meta tags
  const cleanContent = html
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '')
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, '')
    .replace(/<meta\b[^>]*>/gmi, '');

  const normalized = normalizeContent(cleanContent);
  
  const emails: ContactMatch[] = [];
  const phones: ContactMatch[] = [];

  const emailMatches = normalized.match(EMAIL_PATTERN) || [];
  const phoneMatches = normalized.match(PHONE_PATTERN) || [];

  emailMatches.forEach(email => {
    // Simple validation
    if (email.includes('.') && !emails.some(e => e.value === email)) {
      emails.push({
        value: email.toLowerCase(),
        source_url: url,
        confidence: isContactPage ? 'High' : 'Medium'
      });
    }
  });

  phoneMatches.forEach(phone => {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length >= 7 && digits.length <= 15 && !phones.some(p => p.value === phone)) {
      phones.push({
        value: phone.trim(),
        source_url: url,
        confidence: isContactPage ? 'High' : 'Medium'
      });
    }
  });

  return { emails, phones };
}

export async function crawlCompanyWebsite(domainOrUrl: string): Promise<CrawlResult> {
  const baseUrl = domainOrUrl.startsWith('http') ? domainOrUrl : `https://${domainOrUrl}`;
  const domain = baseUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];

  const pagesToCrawl = [
    baseUrl,
    `${baseUrl.replace(/\/$/, '')}/contact`,
    `${baseUrl.replace(/\/$/, '')}/about`,
    `${baseUrl.replace(/\/$/, '')}/team`,
    `${baseUrl.replace(/\/$/, '')}/support`,
  ];

  const result: CrawlResult = {
    company_domain: domain,
    emails: [],
    phone_numbers: []
  };

  const crawlPromises = pagesToCrawl.map(async (url) => {
    try {
      const response = await fetch(url, { 
        headers: { 'User-Agent': 'LeadVault-Crawler/1.0' },
        signal: AbortSignal.timeout(5000) // 5s timeout
      });
      
      if (!response.ok) return;

      const html = await response.text();
      const isContactPage = url.toLowerCase().includes('contact');
      const extracted = extractFromHtml(html, url, isContactPage);

      extracted.emails.forEach(e => {
        if (!result.emails.find(existing => existing.value === e.value)) {
          result.emails.push(e);
        }
      });

      extracted.phones.forEach(p => {
        if (!result.phone_numbers.find(existing => existing.value === p.value)) {
          result.phone_numbers.push(p);
        }
      });
    } catch (err) {
      console.error(`Failed to crawl ${url}:`, err);
    }
  });

  await Promise.all(crawlPromises);

  return result;
}

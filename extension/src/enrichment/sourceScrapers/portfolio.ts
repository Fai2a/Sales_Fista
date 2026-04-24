import { extractEmails, getBestEmails, type ExtractedEmail, normalizeHtml } from '../emailExtractor';

export async function scrapePortfolio(fullName: string): Promise<ExtractedEmail[]> {
  try {
    // Look for personal websites in LinkedIn "Contact Info" or "Featured"
    // Usually these are non-company, non-social media domains
    const personalLinks = Array.from(document.querySelectorAll('.pv-contact-info__contact-type a')) as HTMLAnchorElement[];
    const candidates = personalLinks.filter(a => {
      const href = a.href.toLowerCase();
      return !href.includes('linkedin.com') && 
             !href.includes('twitter.com') && 
             !href.includes('github.com') &&
             !href.includes('facebook.com');
    });

    if (candidates.length === 0) return [];

    const allEmails: string[] = [];

    const crawlPromises = candidates.map(async (link) => {
      try {
        const response = await fetch(link.href, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return;
        const html = await response.text();
        const normalized = normalizeHtml(html);
        allEmails.push(...extractEmails(normalized));
      } catch (e) {
        // Silent fail
      }
    });

    await Promise.all(crawlPromises);

    return getBestEmails(allEmails, fullName, 'Personal Portfolio');
  } catch (error) {
    console.error('Portfolio scraping failed:', error);
    return [];
  }
}

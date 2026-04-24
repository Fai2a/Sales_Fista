import { extractEmails, getBestEmails, type ExtractedEmail, normalizeHtml } from '../emailExtractor';

export async function scrapeCompanyWebsite(_companyName: string, fullName: string): Promise<ExtractedEmail[]> {
  try {
    // 1. Identify domain (usually found on LinkedIn or via simple search)
    // On LinkedIn, the company page link often contains the domain in its "About" or we can guess.
    const companyLink = document.querySelector('.pv-text-details__right-panel a') as HTMLAnchorElement;
    if (!companyLink) return [];

    // This is a simplified domain extraction. In reality, you'd crawl the LinkedIn company page.
    // For now, let's assume we can get the domain from the company name or the link.
    const domain = await getDomainFromLinkedIn(companyLink.href);
    if (!domain) return [];

    const baseUrl = `https://${domain}`;
    const pagesToCrawl = [
      baseUrl,
      `${baseUrl}/about`,
      `${baseUrl}/contact`,
      `${baseUrl}/team`,
      `${baseUrl}/our-team`,
      `${baseUrl}/management`
    ];

    const allEmails: string[] = [];

    const crawlPromises = pagesToCrawl.map(async (url) => {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return;
        const html = await response.text();
        const normalized = normalizeHtml(html);
        allEmails.push(...extractEmails(normalized));
      } catch (e) {
        // Silent fail for individual pages
      }
    });

    await Promise.all(crawlPromises);

    return getBestEmails(allEmails, fullName, 'Company Website', domain);
  } catch (error) {
    console.error('Company website scraping failed:', error);
    return [];
  }
}

async function getDomainFromLinkedIn(_companyProfileUrl: string): Promise<string | null> {
  // 1. Try to find website in Contact Info modal
  const websiteLinks = Array.from(document.querySelectorAll('.pv-contact-info__contact-type a')) as HTMLAnchorElement[];
  const companyWebsite = websiteLinks.find(a => a.href.includes('company') || a.textContent?.toLowerCase().includes('website'));
  
  if (companyWebsite) {
    try {
      return new URL(companyWebsite.href).hostname.replace('www.', '');
    } catch (e) {}
  }

  // 2. Fallback: If we have the company profile URL, we could fetch it, 
  // but that's complex. For now, we'll try to extract from the company name.
  return null;
}

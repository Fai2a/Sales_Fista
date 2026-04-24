import { extractEmails, getBestEmails, type ExtractedEmail } from '../emailExtractor';

export async function scrapeGitHub(fullName: string): Promise<ExtractedEmail[]> {
  try {
    // Note: In a real extension, you'd use a search API or search page scraping
    // For this implementation, we assume we can find the profile URL via a search simulation
    // or by checking common patterns.
    
    // 1. Search for GitHub profile (Mocking the search part for now as it usually requires a backend or SERP API)
    // In a Chrome Extension, we can use the 'google' search results or similar if we have permissions.
    // For now, let's assume we find a likely candidate.
    
    // Simplified logic: Try to find github.com link in a search result
    // Since we can't easily perform a Google search from content script without triggering captchas,
    // we'll rely on the profile often linking their GitHub in their LinkedIn "Website" section or "Featured".
    
    // If the LinkedIn profile has a GitHub link, we crawl it.
    const githubLink = document.querySelector('a[href*="github.com"]') as HTMLAnchorElement;
    if (!githubLink) return [];

    const githubUrl = githubLink.href;
    const response = await fetch(githubUrl);
    const html = await response.text();
    
    // Extract from bio and public info
    const emails = extractEmails(html);
    
    // Also try to find public emails from commits if possible (requires more complex fetching)
    // github.com/user.patch often contains the author's email
    const username = githubUrl.split('/').pop();
    if (username) {
      try {
        const patchRes = await fetch(`https://github.com/${username}.patch`);
        const patchText = await patchRes.text();
        const patchEmails = extractEmails(patchText);
        emails.push(...patchEmails);
      } catch (e) {
        console.warn('GitHub patch fetch failed');
      }
    }

    return getBestEmails(emails, fullName, 'GitHub');
  } catch (error) {
    console.error('GitHub scraping failed:', error);
    return [];
  }
}

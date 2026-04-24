import { sanitizeField, waitForElement, wait, log } from '../content-utils';

export interface LinkedInContactInfo {
  email: string | null;
  website: string | null;
}

/**
 * Extracts Email and Company Website from LinkedIn Contact Info modal
 */
export async function extractLinkedInContactInfo(): Promise<LinkedInContactInfo> {
  log('Extracting LinkedIn Contact Info (Email + Website)...');
  
  try {
    // 1. Ensure modal is open
    if (!window.location.href.includes('/overlay/contact-info/')) {
      const contactLink = document.querySelector('a[href*="overlay/contact-info"]') as HTMLElement;
      if (contactLink) {
        contactLink.click();
        await waitForElement('.pv-contact-info, .artdeco-modal', 4000);
        await wait(500); // Allow modal hydration
      }
    }

    // 2. Extract Email
    let email: string | null = null;
    
    // Strategy 1 — Direct mailto link
    const mailtoLink = document.querySelector('a[href^="mailto:"]');
    email = mailtoLink?.getAttribute('href')?.replace('mailto:', '').trim() || null;

    // Strategy 2 — Contact info section link text
    if (!email) {
      const emailLink = document.querySelector('.pv-contact-info__contact-type a[href^="mailto:"]') || 
                        document.querySelector('.pv-contact-info__contact-type--email a');
      email = emailLink?.textContent?.trim() || null;
    }

    // 3. Extract Website (specifically looking for company/corporate sites)
    let website: string | null = null;
    const websiteLinks = Array.from(document.querySelectorAll('.pv-contact-info__contact-type--website a')) as HTMLAnchorElement[];
    
    // Find a link that isn't personal or social
    const companySite = websiteLinks.find(a => {
      const href = a.href.toLowerCase();
      const text = a.textContent?.toLowerCase() || '';
      return (text.includes('company') || text.includes('corporate') || text.includes('website')) && 
             !href.includes('linkedin.com') && 
             !href.includes('twitter.com') && 
             !href.includes('github.com');
    });

    if (companySite) {
      website = companySite.href;
    } else if (websiteLinks.length > 0) {
      // Fallback to first website if no explicit "company" label
      website = websiteLinks[0].href;
    }

    return {
      email: sanitizeField(email),
      website: website ? new URL(website).href : null
    };
  } catch (err) {
    log('Contact info extraction failed:', err);
    return { email: null, website: null };
  } finally {
    // Note: Modal dismissal is handled by the caller or a separate lifecycle
  }
}

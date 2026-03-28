import type { ExtensionMessage, LeadData } from './types';

chrome.runtime.onMessage.addListener((request: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  
  if (request.action === 'PING') {
    sendResponse({ success: true });
    return true;
  }

  const waitForElement = (selector: string, timeoutMs: number = 5000): Promise<Element | null> => {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const obsEl = document.querySelector(selector);
        if (obsEl) {
          observer.disconnect();
          resolve(obsEl);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }, timeoutMs);
    });
  };
  if (request.action === 'SCRAPE_PROFILE') {
    const scrapeData = (): LeadData => {
      
      const getText = (selector: string): string => {
        const el = document.querySelector(selector);
        return el ? (el.textContent || '').trim() : '';
      };
      
      // Robust Selectors for LinkedIn (March 2026)
      const name = getText('h1') || getText('h1.text-heading-xlarge') || getText('.text-heading-xlarge');
      const designation = getText('div.text-body-medium.break-words') || getText('.pv-text-details__left-panel .text-body-medium') || getText('div[data-generated-suggestion-target]');
      const profileUrl = window.location.href.split('?')[0];

      return {
        name,
        designation,
        company: '',
        location: '',
        city: '',
        linkedin_url: profileUrl,
        profile_image: '',
        connectionCount: '',
        bio: '',
        skills: []
      };
    };

    window.scrollTo(0, 500);
    setTimeout(() => {
      window.scrollTo(0, 0);
      sendResponse({ data: scrapeData() });
    }, 500);

    return true; 
  }

  const extractContactData = async (type: 'email' | 'phone') => {
    // Strategy 1: Find by ID or specific href
    let contactInfoLink = document.querySelector('a#top-card-text-details-contact-info, a[href*="/overlay/contact-info/"]') as HTMLAnchorElement;
    
    // Strategy 2: Find by text content "Contact info"
    if (!contactInfoLink) {
        const links = Array.from(document.querySelectorAll('a'));
        contactInfoLink = links.find(l => l.textContent?.trim().toLowerCase() === 'contact info') as HTMLAnchorElement;
    }

    if (contactInfoLink) {
      contactInfoLink.click();
      
      const modal = await waitForElement('.pv-contact-info, .artdeco-modal, .pv-about-section, [role="dialog"]');
      if (!modal) return { success: false, data: '' };

      const pollForData = (type: 'email' | 'phone', maxAttempts = 20): Promise<string> => {
        return new Promise((resolve) => {
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            let found = '';

            if (type === 'email') {
              // Standard Selectors
              const mailto = document.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
              if (mailto) found = mailto.textContent?.replace('mailto:', '').trim() || '';
              
              if (!found) {
                const el = document.querySelector('.ci-email .pv-contact-info__contact-item, .pv-contact-info__contact-link[href^="mailto:"]');
                if (el) found = el.textContent?.trim() || '';
              }

              // Text Fallback in modal
              if (!found && attempts > 10) {
                const text = modal.textContent || '';
                const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                if (match) found = match[0];
              }
            } else {
              // Phone Standard Selectors
              const phoneLink = document.querySelector('.pv-contact-info__contact-link[href^="tel:"]');
              if (phoneLink) found = phoneLink.textContent?.trim() || '';

              if (!found) {
                const phoneSection = Array.from(document.querySelectorAll('section.pv-contact-info__contact-type, .pv-contact-info__contact-type'))
                  .find(s => s.querySelector('svg[data-test-icon="phone-handset-medium"]') || s.textContent?.toLowerCase().includes('phone'));
                
                if (phoneSection) {
                  const phoneItem = phoneSection.querySelector('.t-14, li, .pv-contact-info__contact-item, .pv-contact-info__contact-link');
                  if (phoneItem) found = phoneItem.textContent?.trim() || '';
                }
              }

              // Text Fallback Regex
              if (!found && attempts > 10) {
                const text = modal.textContent || '';
                // Simple regex for international or domestic phone numbers
                const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/);
                if (match) found = match[0];
              }
            }

            if (found || attempts >= maxAttempts) {
              clearInterval(interval);
              resolve(found);
            }
          }, 250);
        });
      };

      const result = await pollForData(type);
      
      if (result) {
        if (type === 'email') chrome.storage.local.set({ scraped_email: result });
        else chrome.storage.local.set({ scraped_phone: result });
      }

      // Close the modal carefully
      const closeBtn = document.querySelector('button[aria-label="Dismiss"], .artdeco-modal__dismiss, [data-test-modal-close-btn]') as HTMLButtonElement;
      if (closeBtn) closeBtn.click();

      return { success: !!result, data: result };
    }
    
    return { success: false, data: '' };
  };

  if (request.action === 'EXTRACT_EMAIL') {
    extractContactData('email').then(res => sendResponse(res));
    return true;
  }

  if (request.action === 'EXTRACT_PHONE') {
    extractContactData('phone').then(res => sendResponse(res));
    return true;
  }
});

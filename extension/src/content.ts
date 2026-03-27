import type { ExtensionMessage, LeadData } from './types';

chrome.runtime.onMessage.addListener((request: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  
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
    const contactInfoLink = document.querySelector('a#top-card-text-details-contact-info, a[href*="/overlay/contact-info/"]') as HTMLAnchorElement;
    
    if (contactInfoLink) {
      contactInfoLink.click();
      
      const modal = await waitForElement('.pv-contact-info, .artdeco-modal, .pv-about-section');
      if (!modal) return { success: false, data: '' };

      const pollForData = (type: 'email' | 'phone', maxAttempts = 15): Promise<string> => {
        return new Promise((resolve) => {
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            let found = '';

            if (type === 'email') {
              // 1. Classic mailto link
              const mailto = document.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
              if (mailto) found = mailto.textContent?.replace('mailto:', '').trim() || '';
              
              // 2. Section based (class ci-email is common in newer LinkedIn)
              if (!found) {
                const emailSection = document.querySelector('.ci-email .pv-contact-info__contact-item');
                if (emailSection) found = emailSection.textContent?.trim() || '';
              }

              // 3. Header text find
              if (!found) {
                const sections = Array.from(document.querySelectorAll('section.pv-contact-info__contact-type'));
                const target = sections.find(s => s.textContent?.toLowerCase().includes('email'));
                if (target) {
                  const val = target.querySelector('a, .t-14, .pv-contact-info__contact-item');
                  if (val) found = val.textContent?.trim() || '';
                }
              }

              // 4. Regex fallback in modal
              if (!found && attempts > 5) {
                const text = modal.textContent || '';
                const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                if (match) found = match[0];
              }
            } else {
              // Phone extraction patterns
              const phoneSection = Array.from(document.querySelectorAll('section.pv-contact-info__contact-type'))
                .find(s => s.querySelector('svg[data-test-icon="phone-handset-medium"]') || s.textContent?.toLowerCase().includes('phone'));
              
              if (phoneSection) {
                const phoneItem = phoneSection.querySelector('.t-14, li, .pv-contact-info__contact-item');
                if (phoneItem) found = phoneItem.textContent?.trim() || '';
              }

              // Regex fallback
              if (!found && attempts > 5) {
                const text = modal.textContent || '';
                const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
                if (match) found = match[0];
              }
            }

            if (found || attempts >= maxAttempts) {
              clearInterval(interval);
              resolve(found);
            }
          }, 200);
        });
      };

      const result = await pollForData(type);
      
      if (type === 'email') chrome.storage.local.set({ scraped_email: result });
      else chrome.storage.local.set({ scraped_phone: result });

      // Close the modal
      const closeBtn = document.querySelector('button[aria-label="Dismiss"], .artdeco-modal__dismiss') as HTMLButtonElement;
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

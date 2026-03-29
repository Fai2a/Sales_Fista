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
  const waitForContent = (selector: string, timeoutMs: number = 3000): Promise<string> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const check = () => {
        const el = document.querySelector(selector);
        const text = el ? (el.textContent || '').trim() : '';
        // Ignore "LinkedIn" or very short/empty strings that might be placeholders
        if (text && text.length > 2 && text !== 'LinkedIn') {
          resolve(text);
        } else if (Date.now() - startTime > timeoutMs) {
          resolve('');
        } else {
          setTimeout(check, 200);
        }
      };
      check();
    });
  };

  if (request.action === 'SPA_NAVIGATED') {
    // LinkedIn SPA navigation detected. Prepare for new scrape.
    console.log("LeadVault: SPA Navigation detected. Ready to scrape new profile.");
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'SCRAPE_PROFILE') {
    const scrapeData = async (): Promise<LeadData> => {
      console.log("LeadVault: Starting hybrid content-aware scan...");
      
      // 1. Wait for core profile container (Supports both Internal and Public)
      await waitForElement('main.scaffold-layout__main, .pv-top-card, main#workspace, section.top-card-layout', 3000);
      
      const getAttribute = (selector: string, attr: string): string => {
        const el = document.querySelector(selector);
        return el ? (el.getAttribute(attr) || '') : '';
      };

      const getMultipleText = (selectors: string[]): string => {
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            const text = el ? (el.textContent || '').trim() : '';
            if (text && text.length > 2 && text !== 'LinkedIn') return text;
        }
        return '';
      }

      // 2. Hybrid Selectors for Name (Internal + Public) (Task 1)
      const nameSelectors = [
          'h1.text-heading-xlarge', 
          'h1', 
          'h2.top-card-layout__title', 
          'section.top-card-layout h1', 
          '[data-generated-suggestion-target]',
          'div.mt2 h2',
          '.pv-text-details__left-panel h1'
      ];
      const name = await waitForContent(nameSelectors.join(','), 3000) || getMultipleText(nameSelectors) || 'Unknown';

      // 3. Hybrid Selectors for Headline (Task 1)
      const designationSelectors = [
          'div.text-body-medium.break-words', 
          'h2.top-card-layout__headline', 
          'p.top-card-layout__headline', 
          '.pv-text-details__left-panel .text-body-medium',
          '.top-card-layout__headline',
          'div.text-body-medium'
      ];
      const designation = getMultipleText(designationSelectors);
      
      console.log(`LeadVault Hybrid Hydration: Name="${name}", Headline="${designation}"`);

      // 4. Hybrid Selectors for Location (Task 1)
      const locationSelectors = [
          'span.text-body-small.inline.t-black--light.break-words', 
          'span.top-card-layout__first-subline', 
          'span.top-card-layout__badge--location', 
          '.pb2 span.text-body-small.inline',
          '.pv-text-details__left-panel .text-body-small.inline'
      ];
      let locationText = getMultipleText(locationSelectors);

      // 5. Expand Company logic for Public View & Multi-Strategy (Task 3)
      let company = '';
      const companySelectors = [
          '[aria-label="Current Company"]',
          '.pv-text-details__right-panel li button span',
          '.pv-text-details__right-panel .inline-show-more-text',
          'span.top-card-link__description', // Public View
          '.top-card-link__description',
          'a[data-control-name="company_link"] span'
      ];

      for (let i = 0; i < 3; i++) {
          company = getMultipleText(companySelectors);
          
          if (!company) {
              // Structural Fallback: Search experience section (Task 3)
              // Works for both Internal (#experience) and Public (.experience-section)
              const expList = document.querySelector('#experience ~ div ul, .experience-section ul, #experience-section + div ul');
              if (expList) {
                 const firstItem = expList.querySelector('li');
                 if (firstItem) {
                     // Try multiple company name tags within the first experience item
                     const compName = firstItem.querySelector('.t-14.t-normal span[aria-hidden="true"], .t-14.t-normal, p.experience-item__subtitle, span.experience-item__subtitle');
                     company = compName ? (compName as HTMLElement).innerText : '';
                 }
              }
          }

          if (company) {
              company = company.split('·')[0].trim();
              break;
          }
          console.log(`LeadVault: Retrying Company extraction (Attempt ${i+1}/3)...`);
          await new Promise(r => setTimeout(r, 600));
      }

      const profileUrl = window.location.href.split('?')[0];
      const profile_image = getAttribute('img.pv-top-card-profile-picture__image', 'src') || 
                            getAttribute('img.top-card-layout__entity-image', 'src') ||
                            getAttribute('.pv-top-card--photo img', 'src') || '';

      const connectionCountRaw = getMultipleText(['.pv-top-card--list-bullet li span.text-body-small span:first-child', '.member-connections span', '.top-card__connections']);
      const connectionCount = connectionCountRaw.replace(/[^\d+]/g, '');

      const bio = getMultipleText(['#about ~ .display-flex span[aria-hidden="true"]', '.pv-about-section .pv-about__summary-text', '.summary p']);

      const results = {
        name,
        designation: designation || 'Not Available',
        company: company || 'Not Available',
        location: locationText || 'Not Available',
        city: locationText.split(',')[0].trim(),
        linkedin_url: profileUrl,
        profile_image,
        connectionCount,
        bio,
        skills: [] as string[]
      };

      console.log("LeadVault Scraper Results:", results);
      return results;
    };

    // Settlement delay for SPA navigation
    window.scrollTo(0, 300);
    setTimeout(async () => {
      window.scrollTo(0, 0);
      const data = await scrapeData();
      sendResponse({ data });
    }, 600);

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

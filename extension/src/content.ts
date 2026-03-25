import type { ExtensionMessage, LeadData } from './types';

chrome.runtime.onMessage.addListener((request: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (request.action === 'SCRAPE_PROFILE') {
    const scrapeData = (): LeadData => {
      
      const getText = (selector: string): string => {
        const el = document.querySelector(selector);
        return el ? (el.textContent || '').trim() : '';
      };

      const getAttr = (selector: string, attr: string): string => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute(attr) || '' : '';
      };
      
      // Selectors (LinkedIn frequently changes these, so these are broad/standard fallback attempts)
      const name = getText('h1.text-heading-xlarge') || getText('.text-heading-xlarge');
      const designation = getText('.text-body-medium.break-words') || getText('div[data-generated-suggestion-target]');
      const location = getText('.text-body-small.inline.t-black--light.break-words') || getText('span.text-body-small.inline');
      
      const companyElement = document.querySelector('button[aria-label*="Current company"] .inline-show-more-text');
      const company = companyElement ? (companyElement.textContent || '').trim() : '';

      const profileUrl = window.location.href.split('?')[0];

      let photoUrl = getAttr('img.pv-top-card-profile-picture__image', 'src') || getAttr('.profile-photo-edit__preview', 'src');
      if (photoUrl && photoUrl.startsWith('data:image')) photoUrl = ''; 
      
      let connectionCount = getText('ul.pv-top-card--list span.t-bold') || getText('li.text-body-small span.t-bold');
      if (!connectionCount) {
         const connLink = document.querySelector('a[href*="connections"]');
         connectionCount = connLink ? (connLink.textContent || '').replace(/connections/i, '').trim() : '';
      }

      const aboutBox = document.querySelector('div#about ~ div.ph5, section > div#about');
      let bio = '';
      if(aboutBox) {
        bio = aboutBox.parentElement?.querySelector('.inline-show-more-text')?.textContent?.trim() || '';
      }
      if(bio.length > 300) bio = bio.substring(0, 300) + '...';

      return {
        name,
        designation,
        company,
        location,
        profileUrl,
        photoUrl,
        connectionCount,
        bio
      };
    };

    window.scrollTo(0, 500);
    setTimeout(() => {
      window.scrollTo(0, 0);
      sendResponse({ data: scrapeData() });
    }, 500);

    return true; 
  }

  if (request.action === 'SCRAPE_CONTACT_INFO') {
    // Attempt to click contact info link
    const contactInfoLink = document.querySelector('a#top-card-text-details-contact-info') as HTMLAnchorElement;
    if (contactInfoLink) {
      contactInfoLink.click();
      
      setTimeout(() => {
        const emailLink = document.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
        const phoneSection = Array.from(document.querySelectorAll('section.pv-contact-info__contact-type')).find(el => el.querySelector('svg[data-test-icon="phone-handset-medium"]'));
        const phoneItem = phoneSection ? phoneSection.querySelector('span.t-14') || phoneSection.querySelector('li') : null;

        const email = emailLink ? emailLink.textContent?.replace('mailto:', '')?.trim() : '';
        const phone = phoneItem ? phoneItem.textContent?.trim() : '';

        // Close the modal
        const closeBtn = document.querySelector('button[aria-label="Dismiss"]') as HTMLButtonElement;
        if (closeBtn) closeBtn.click();

        sendResponse({ data: { email, phone } });
      }, 1500); // give time for modal to render
    } else {
      // Fallback if contact info link not found
      sendResponse({ data: { email: '', phone: '' } });
    }
    return true;
  }
});

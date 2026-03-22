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
      
      // Sometimes company is the first item in the experiences section or listed in the top card
      const companyElement = document.querySelector('button[aria-label*="Current company"] .inline-show-more-text');
      const company = companyElement ? (companyElement.textContent || '').trim() : '';

      // Profile url is current url without query params
      const profileUrl = window.location.href.split('?')[0];

      // Wait a tiny bit for images to be lazy-loaded if needed, but we'll try to just grab it
      let photoUrl = getAttr('img.pv-top-card-profile-picture__image', 'src') || getAttr('.profile-photo-edit__preview', 'src');
      if (photoUrl && photoUrl.startsWith('data:image')) photoUrl = ''; // Avoid huge base64
      
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

    // Scroll to bottom and top slightly to trigger lazy-loaded elements like the image
    window.scrollTo(0, 500);
    setTimeout(() => {
      window.scrollTo(0, 0);
      sendResponse({ data: scrapeData() });
    }, 500);

    return true; // indicates asynchronous response
  }
});

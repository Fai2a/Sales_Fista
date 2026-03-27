"use strict";
(() => {
  // src/content.ts
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    const waitForElement = (selector, timeoutMs = 5e3) => {
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
    if (request.action === "SCRAPE_PROFILE") {
      const scrapeData = () => {
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? (el.textContent || "").trim() : "";
        };
        const getAttr = (selector, attr) => {
          const el = document.querySelector(selector);
          return el ? el.getAttribute(attr) || "" : "";
        };
        const name = getText("h1") || getText("h1.text-heading-xlarge") || getText(".text-heading-xlarge");
        const designation = getText("div.text-body-medium.break-words") || getText(".pv-text-details__left-panel .text-body-medium") || getText("div[data-generated-suggestion-target]");
        const location = getText(".pv-text-details__left-panel .text-body-small.inline") || getText(".text-body-small.inline.t-black--light.break-words") || getText("span.text-body-small.inline");
        let company = getText(".pv-text-details__right-panel li button span") || getText(".pv-text-details__right-panel li .inline-show-more-text");
        if (!company) {
          const companyElement = document.querySelector('button[aria-label*="Current company"] .inline-show-more-text');
          company = companyElement ? (companyElement.textContent || "").trim() : "";
        }
        const profileUrl = window.location.href.split("?")[0];
        let connectionCount = getText("ul.pv-top-card--list span.t-bold") || getText("li.text-body-small span.t-bold") || getText(".pv-top-card--list li .t-bold");
        if (!connectionCount) {
          const connLink = document.querySelector('a[href*="connections"]');
          connectionCount = connLink ? (connLink.textContent || "").replace(/connections/i, "").trim() : "";
        }
        const aboutBox = document.querySelector("div#about ~ div.ph5, section > div#about, #about");
        let bio = "";
        if (aboutBox) {
          const bioElem = aboutBox.parentElement?.querySelector(".inline-show-more-text") || document.querySelector(".pv-about-section .inline-show-more-text");
          bio = bioElem ? (bioElem.textContent || "").trim() : "";
        }
        if (bio.length > 300) bio = bio.substring(0, 300) + "...";
        return {
          name,
          designation,
          company,
          location,
          city: location,
          linkedin_url: profileUrl,
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
    const extractContactData = async (type) => {
      const contactInfoLink = document.querySelector('a#top-card-text-details-contact-info, a[href*="/overlay/contact-info/"]');
      if (contactInfoLink) {
        contactInfoLink.click();
        const modal = await waitForElement(".pv-contact-info, .artdeco-modal, .pv-about-section");
        if (!modal) return { success: false, data: "" };
        const pollForData = (type2, maxAttempts = 15) => {
          return new Promise((resolve) => {
            let attempts = 0;
            const interval = setInterval(() => {
              attempts++;
              let found = "";
              if (type2 === "email") {
                const mailto = document.querySelector('a[href^="mailto:"]');
                if (mailto) found = mailto.textContent?.replace("mailto:", "").trim() || "";
                if (!found) {
                  const emailItem = document.querySelector(".ci-email .pv-contact-info__contact-item, .pv-contact-info__contact-type.ci-email a, section.pv-contact-info__contact-type.ci-email .t-14");
                  if (emailItem) found = emailItem.textContent?.trim() || "";
                }
                if (!found) {
                  const sections = Array.from(document.querySelectorAll("section.pv-contact-info__contact-type"));
                  const target = sections.find((s) => s.textContent?.toLowerCase().includes("email"));
                  if (target) {
                    const val = target.querySelector("a, .t-14, .pv-contact-info__contact-item");
                    if (val) found = val.textContent?.trim() || "";
                  }
                }
                if (!found && attempts > 5) {
                  const text = modal.textContent || "";
                  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                  if (match) found = match[0];
                }
              } else {
                const phoneSection = Array.from(document.querySelectorAll("section.pv-contact-info__contact-type")).find((s) => 
                  s.querySelector('svg[data-test-icon="phone-handset-medium"]') || 
                  s.querySelector('svg[data-test-icon="phone"]') ||
                  s.textContent?.toLowerCase().includes("phone")
                );
                if (phoneSection) {
                  const phoneItem = phoneSection.querySelector(".t-14, li, .pv-contact-info__contact-item, span.t-black");
                  if (phoneItem) found = phoneItem.textContent?.trim() || "";
                }
                if (!found) {
                  const phoneLink = document.querySelector('a[href^="tel:"]');
                  if (phoneLink) found = phoneLink.textContent?.trim() || "";
                }
                if (!found && attempts > 5) {
                  const text = modal.textContent || "";
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
        if (type === "email") chrome.storage.local.set({ scraped_email: result });
        else chrome.storage.local.set({ scraped_phone: result });
        const closeBtn = document.querySelector('button[aria-label="Dismiss"], .artdeco-modal__dismiss');
        if (closeBtn) closeBtn.click();
        return { success: !!result, data: result };
      }
      return { success: false, data: "" };
    };
    if (request.action === "EXTRACT_EMAIL") {
      extractContactData("email").then((res) => sendResponse(res));
      return true;
    }
    if (request.action === "EXTRACT_PHONE") {
      extractContactData("phone").then((res) => sendResponse(res));
      return true;
    }
  });
})();

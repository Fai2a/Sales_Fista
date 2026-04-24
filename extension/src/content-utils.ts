// ─── Core Utilities for Content Scripts ────────────────────────────────────────

export function isContextValid(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

export const log = (...args: any[]) => {
  if (!isContextValid()) return;
  console.log(`%c[LeadVault][${new Date().toLocaleTimeString()}]`, 'color: #10b981; font-weight: bold;', ...args);
};

export const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

export function sanitizeField(value: string | null | undefined): string | null {
  if (!value) return null;
  let clean = value.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^\d+$/.test(clean)) return null; 
  return clean || null;
}

export async function waitForElement(selector: string, timeout = 10000): Promise<HTMLElement | null> {
  if (!isContextValid()) return null;
  return new Promise((resolve) => {
    const interval = 300;
    let elapsed = 0;

    const timer = setInterval(() => {
      if (!isContextValid()) {
        clearInterval(timer);
        return resolve(null);
      }
      const el = document.querySelector(selector) as HTMLElement;
      if (el && el.innerText && el.innerText.trim().length > 0) {
        clearInterval(timer);
        resolve(el);
      }
      
      elapsed += interval;
      if (elapsed >= timeout) {
        clearInterval(timer);
        resolve(null);
      }
    }, interval);
  });
}

export function safeChromeCall<T>(fn: () => T, cleanupCallback?: () => void): T | null {
  if (!isContextValid()) return null;
  try {
    return fn();
  } catch (err: any) {
    if (err.message?.includes('context invalidated')) {
      console.warn('[LeadVault] Extension context invalidated. Cleaning up script...');
      if (cleanupCallback) cleanupCallback();
    }
    return null;
  }
}

export function cleanup(navWatcher?: any) {
  if (navWatcher) clearInterval(navWatcher);
  if (typeof window !== 'undefined') {
    (window as any).__LEADVAULT_INITIALIZED__ = false;
  }
}

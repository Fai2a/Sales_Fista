/**
 * Email Extraction & Validation Logic
 */

export interface ExtractedEmail {
  email: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
}

const GENERIC_EMAILS = [
  'support@', 'info@', 'careers@', 'sales@', 'hello@', 'contact@',
  'admin@', 'webmaster@', 'noreply@', 'hr@', 'jobs@'
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Normalizes content by handling common obfuscations
 */
export function normalizeHtml(html: string): string {
  return html
    .replace(/\s*\[at\]\s*|\s*\(at\)\s*|\s+at\s+/gi, '@')
    .replace(/\s*\[dot\]\s*|\s*\(dot\)\s*|\s+dot\s+/gi, '.')
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '')
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, '')
    .replace(/\s+/g, ' ');
}

/**
 * Extracts unique valid emails from a string
 */
export function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) || [];
  return [...new Set(matches.map(m => m.toLowerCase()))];
}

/**
 * Validates and scores an email based on profile data
 */
export function scoreEmail(
  email: string, 
  fullName: string, 
  companyDomain?: string
): ExtractedEmail {
  const nameParts = fullName.toLowerCase().split(' ').filter(p => p.length > 2);
  const [user, domain] = email.split('@');
  
  let score = 0;
  
  // Check if name parts are in the email user part
  nameParts.forEach(part => {
    if (user.includes(part)) score += 2;
  });

  // Check if domain matches company domain
  if (companyDomain && domain.includes(companyDomain)) {
    score += 5;
  }

  // Check if it's a generic email
  const isGeneric = GENERIC_EMAILS.some(g => email.startsWith(g));
  if (isGeneric) score -= 3;

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (score >= 5) confidence = 'high';
  else if (score >= 2) confidence = 'medium';

  return {
    email,
    source: 'unknown',
    confidence
  };
}

export function getBestEmails(
  emails: string[], 
  fullName: string, 
  source: string,
  companyDomain?: string
): ExtractedEmail[] {
  return emails
    .map(e => ({ ...scoreEmail(e, fullName, companyDomain), source }))
    .filter(e => {
      // Reject weak/random matches: must have at least one name part OR domain match
      // unless we really want to keep low confidence ones (the user said "Reject weak or random matches")
      const [user, domain] = e.email.split('@');
      const nameParts = fullName.toLowerCase().split(' ').filter(p => p.length > 2);
      const hasNameMatch = nameParts.some(part => user.includes(part));
      const hasDomainMatch = companyDomain && domain.includes(companyDomain);
      
      return hasNameMatch || hasDomainMatch;
    })
    .sort((a, b) => {
      const scores = { high: 3, medium: 2, low: 1 };
      return scores[b.confidence] - scores[a.confidence];
    });
}

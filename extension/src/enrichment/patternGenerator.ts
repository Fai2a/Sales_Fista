import type { ExtractedEmail } from './emailExtractor';

/**
 * LeadVault Email Pattern Generator (Spec v1.0)
 * Generates common corporate email patterns based on name and domain.
 */
export function generateEmailPatterns(
  fullName: string, 
  domain: string
): ExtractedEmail[] {
  if (!fullName || !domain) return [];

  const parts = fullName.toLowerCase().trim().split(/\s+/);
  if (parts.length < 1) return [];

  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  const firstInitial = first.charAt(0);

  const patterns = [
    // 1. first@domain.com
    `${first}@${domain}`,
    
    // 2. first.last@domain.com
    last ? `${first}.${last}@${domain}` : null,
    
    // 3. first_initial + last@domain.com
    last ? `${firstInitial}${last}@${domain}` : null,
    
    // Additional common patterns
    last ? `${first}${last}@${domain}` : null,
    last ? `${firstInitial}.${last}@${domain}` : null,
  ].filter(p => p !== null) as string[];

  return patterns.map(email => ({
    email,
    source: 'Pattern Generation',
    confidence: 'low' // Guessed emails are always low confidence per spec
  }));
}

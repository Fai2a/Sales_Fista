export interface EnrichmentResult {
  email: string | null;
  source: string | null;
  confidence: 'High' | 'Medium' | 'Low' | null;
}

export interface LeadData {
  name: string;
  headline: string | null;
  designation: string | null;
  company: string | null;
  location: string | null;
  city: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url: string;
  profile_image: string | null;
  connectionCount: string | null;
  bio: string | null;
  about?: string | null;
  skills: string[];
  savedAt?: string;
  enrichment?: EnrichmentResult;
}

export interface ExtensionMessage {
  action: 'SCRAPE_PROFILE' | 'SCRAPE_CONTACT_INFO' | 'EXTRACT_EMAIL' | 'EXTRACT_PHONE' | 'PING' | 'SPA_NAVIGATED' | 'ENRICH_DATA';
}

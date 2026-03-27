export interface LeadData {
  name: string;
  designation: string;
  company: string;
  location: string;
  city: string;
  email?: string;
  phone?: string;
  linkedin_url: string;
  profile_image: string;
  connectionCount: string;
  bio: string;
}

export interface ExtensionMessage {
  action: 'SCRAPE_PROFILE' | 'SCRAPE_CONTACT_INFO' | 'EXTRACT_EMAIL' | 'EXTRACT_PHONE';
}

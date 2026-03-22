export interface LeadData {
  name: string;
  designation: string;
  company: string;
  location: string;
  email?: string;
  phone?: string;
  profileUrl: string;
  photoUrl: string;
  connectionCount: string;
  bio: string;
}

export interface ExtensionMessage {
  action: 'SCRAPE_PROFILE';
}

export interface Lead {
  id: string;
  name: string;
  designation: string | null;
  company: string | null;
  location: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  profile_image: string | null;
  bio: string | null;
  connectionCount: string | null;
  saved_at: Date;
  notes: string | null;
  tags: string; // JSON string array
  status: string; // NEW, CONTACTED, QUALIFIED, REJECTED
}

export interface Lead {
  id: string;
  name: string;
  designation: string | null;
  company: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  profileUrl: string | null;
  photoUrl: string | null;
  bio: string | null;
  connectionCount: string | null;
  savedAt: Date;
  notes: string | null;
  tags: string; // JSON string array
  status: string; // NEW, CONTACTED, QUALIFIED, REJECTED
}

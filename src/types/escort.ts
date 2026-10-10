export interface EscortApplication {
  id: string;
  creator_id: string;
  name: string | null;
  bio: string | null;
  age: number | null;
  location: string | null;
  measurements: string | null;
  rates: string | null;
  photos: string[] | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

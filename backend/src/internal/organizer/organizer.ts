export interface Organizer {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;  
}
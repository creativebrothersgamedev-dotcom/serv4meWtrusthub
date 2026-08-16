export type Role = 'consumer' | 'provider' | 'admin';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type RatingStatus = 'pending' | 'approved' | 'disputed' | 'rejected';

export interface Profile {
  id: string;
  role: Role;
  email: string;
  suspended: boolean;
  created_at: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface ProviderProfile {
  user_id: string;
  company_name: string;
  alias: string;
  website: string;
  social_links: SocialLink[];
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  logo_url: string;
  languages: string[];
  created_at: string;
}

export interface ConsumerProfile {
  user_id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  preferred_languages: string[];
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Service {
  id: string;
  provider_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  consumer_id: string;
  provider_id: string;
  service_id: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  status: MessageStatus;
  created_at: string;
}

export interface Rating {
  id: string;
  conversation_id: string;
  consumer_id: string;
  provider_id: string;
  stars: number;
  review_text: string;
  status: RatingStatus;
  admin_note: string;
  created_at: string;
}

export interface SearchProviderResult {
  user_id: string;
  company_name: string;
  alias: string;
  website: string;
  social_links: SocialLink[];
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  logo_url: string;
  languages: string[];
  avg_rating: number;
  rating_count: number;
  location_score: number;
  match_rank: number;
}

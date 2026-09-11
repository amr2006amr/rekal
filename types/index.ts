export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface WordExample {
  sentence: string;
  translation_ar: string;
}

export interface WordItem {
  id: string;
  word: string;
  level: CEFRLevel;
  pronunciation: string;
  part_of_speech: string;
  definition_ar: string;
  definition_en: string;
  examples: WordExample[];
}

export interface UserProgress {
  id?: string;
  user_id?: string;
  word_id: string;
  ease_factor: number;    // Standard SM-2 ease factor, starts at 2.5
  interval_minutes: number; // Interval until next review in minutes
  next_review: string;    // ISO timestamp
  last_reviewed: string | null;
  review_count: number;
  last_rating: ReviewRating | null; // Most recent rating the user picked for this word
  created_at?: string;
}

export interface UserSettings {
  level: CEFRLevel;
  daily_reviews_used: number;
  daily_reset_at: string;
  subscription_status: 'free' | 'active';
  // Optional: only populated for signed-in users (calculated server-side
  // inside record_review()). Guest/local settings won't have these, so
  // every read site must fall back with ?? 0 / ?? null.
  current_streak?: number;
  last_streak_date?: string | null;
}

export type Locale = 'ar' | 'en';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatUsageInfo {
  messages_used_today: number;
  daily_limit: number;
  remaining: number;
  is_pro: boolean;
}

export interface CustomWordItem extends WordItem {
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomWordUsageInfo {
  is_pro: boolean;
  daily_attempts: number;
  attempts_limit: number;
  attempts_remaining: number;
  quota_used: number;
  quota_limit: number;
  quota_remaining: number;
  allowed: boolean;
}
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
}

export type Locale = 'ar' | 'en';
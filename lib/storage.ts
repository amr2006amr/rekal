import { CEFRLevel, ReviewRating, UserProgress, UserSettings, WordItem } from '@/types';
import { calculateNextReview } from './spaced-repetition';
import { getWordsForLevel, ALL_WORDS_BY_LEVEL, LEVEL_ORDER } from './data/words';
import {
  getUserSettings,
  saveUserSettings,
  getUserProgressMap,
  recordReviewInDB,
  resetUserDataInDB,
  DEFAULT_SETTINGS,
} from './services/supabaseService';
import { supabase, isSupabaseConfigured } from './supabase/client';

export const DAILY_FREE_LIMIT = 50;

const SETTINGS_KEY = 'rekal_user_settings';
const PROGRESS_KEY = 'rekal_user_progress';

export interface ReviewQueueItem {
  word: WordItem;
  progress?: UserProgress;
  isNew: boolean;
}

/**
 * Fetch settings for current user (or localStorage fallback)
 */
export async function getEffectiveSettings(userId?: string | null): Promise<UserSettings> {
  if (userId && isSupabaseConfigured()) {
    return await getUserSettings(userId);
  }

  // Fallback for offline/guest
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings for current user
 */
export async function saveEffectiveSettings(settings: UserSettings, userId?: string | null): Promise<void> {
  if (userId && isSupabaseConfigured()) {
    await saveUserSettings(userId, settings);
    return;
  }

  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
}

/**
 * Fetch progress map for all words for current user
 */
export async function getEffectiveProgressMap(userId?: string | null): Promise<Record<string, UserProgress>> {
  if (userId && isSupabaseConfigured()) {
    return await getUserProgressMap(userId);
  }

  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(PROGRESS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Relative weight of each level distance below the user's own level.
 * Index 0 = the user's own level (highest chance of appearing).
 * Each step further below decreases the chance. Levels above the user's
 * level are never included (enforced by buildWeightedNewItemsQueue).
 */
const LEVEL_WEIGHT_TABLE = [0.5, 0.25, 0.15, 0.07, 0.03];

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a weighted-random ordering of "new" (never reviewed) words.
 * Words at the user's own level are most likely to appear, with
 * progressively lower odds for each level further below it.
 */
function buildWeightedNewItemsQueue(
  userLevel: CEFRLevel,
  progressMap: Record<string, UserProgress>
): ReviewQueueItem[] {
  const userLevelIdx = LEVEL_ORDER.indexOf(userLevel);
  if (userLevelIdx === -1) return [];

  // One pool per eligible level (own level + everything below it), pre-shuffled internally.
  const pools: { weight: number; words: WordItem[] }[] = [];
  for (let dist = 0; dist <= userLevelIdx; dist++) {
    const lvl = LEVEL_ORDER[userLevelIdx - dist];
    const words = (ALL_WORDS_BY_LEVEL[lvl] || []).filter((w) => !progressMap[w.id]);
    if (words.length === 0) continue;
    pools.push({
      weight: LEVEL_WEIGHT_TABLE[dist] ?? LEVEL_WEIGHT_TABLE[LEVEL_WEIGHT_TABLE.length - 1],
      words: shuffleArray(words),
    });
  }

  const result: ReviewQueueItem[] = [];
  while (pools.length > 0) {
    const totalWeight = pools.reduce((sum, p) => sum + p.weight, 0);
    let r = Math.random() * totalWeight;
    let pickIdx = 0;
    for (let i = 0; i < pools.length; i++) {
      r -= pools[i].weight;
      if (r <= 0) {
        pickIdx = i;
        break;
      }
    }
    const pool = pools[pickIdx];
    const word = pool.words.shift()!;
    result.push({ word, isNew: true });
    if (pool.words.length === 0) {
      pools.splice(pickIdx, 1);
    }
  }

  return result;
}

/**
 * Calculate the review queue for a given level and progress map:
 * due words first (unchanged, scheduling-driven), then new words
 * ordered by weighted-random level selection.
 */
export function buildReviewQueue(
  level: CEFRLevel,
  progressMap: Record<string, UserProgress>
): ReviewQueueItem[] {
  const eligibleWords = getWordsForLevel(level);
  const now = Date.now();

  const dueItems: ReviewQueueItem[] = [];

  for (const word of eligibleWords) {
    const progress = progressMap[word.id];
    if (progress) {
      const nextReviewTime = new Date(progress.next_review).getTime();
      if (nextReviewTime <= now) {
        dueItems.push({ word, progress, isNew: false });
      }
    }
  }

  const newItems = buildWeightedNewItemsQueue(level, progressMap);

  return [...dueItems, ...newItems];
}

/**
 * Process a review for a user
 */
export async function processReview(
  wordId: string,
  rating: ReviewRating,
  userId?: string | null,
  currentProgress?: UserProgress,
  currentSettings?: UserSettings
): Promise<{ progress: UserProgress; settings: UserSettings }> {
  if (userId && isSupabaseConfigured()) {
    return await recordReviewInDB(userId, wordId, rating, currentProgress, currentSettings);
  }

  // Fallback
  const sm2 = calculateNextReview(currentProgress, rating);
  const now = new Date().toISOString();

  const updatedProgress: UserProgress = {
    word_id: wordId,
    ease_factor: sm2.easeFactor,
    interval_minutes: sm2.intervalMinutes,
    next_review: sm2.nextReview,
    last_reviewed: now,
    review_count: sm2.reviewCount,
    last_rating: rating,
    created_at: currentProgress?.created_at || now,
  };

  const activeSettings = currentSettings || DEFAULT_SETTINGS;
  const updatedSettings: UserSettings = {
    ...activeSettings,
    daily_reviews_used: (activeSettings.daily_reviews_used || 0) + 1,
  };

  if (typeof window !== 'undefined') {
    try {
      const existing = localStorage.getItem(PROGRESS_KEY);
      const map = existing ? JSON.parse(existing) : {};
      map[wordId] = updatedProgress;
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
    } catch (e) {
      console.error(e);
    }
  }

  return { progress: updatedProgress, settings: updatedSettings };
}

/**
 * Clear data for user
 */
export async function clearUserData(userId?: string | null): Promise<void> {
  if (userId && isSupabaseConfigured()) {
    await resetUserDataInDB(userId);
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  }
}
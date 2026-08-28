import { CEFRLevel, ReviewRating, UserProgress, UserSettings } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { calculateNextReview } from '@/lib/spaced-repetition';

export const DEFAULT_SETTINGS: UserSettings = {
  level: 'B2',
  daily_reviews_used: 0,
  daily_reset_at: new Date().toISOString(),
  subscription_status: 'free',
};

// Check if daily reset is needed (midnight passed)
export function checkDailyReset(settings: UserSettings): UserSettings {
  const now = new Date();
  const resetAt = new Date(settings.daily_reset_at || now.toISOString());

  const isDifferentDay =
    now.getFullYear() !== resetAt.getFullYear() ||
    now.getMonth() !== resetAt.getMonth() ||
    now.getDate() !== resetAt.getDate();

  if (isDifferentDay) {
    return {
      ...settings,
      daily_reviews_used: 0,
      daily_reset_at: now.toISOString(),
    };
  }
  return settings;
}

/**
 * Fetch or initialize settings from Supabase user_settings table
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS;

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user_settings:', error);
      return DEFAULT_SETTINGS;
    }

    if (!data) {
      // Initialize row for user
      const initialSettings = {
        user_id: userId,
        level: DEFAULT_SETTINGS.level,
        daily_reviews_used: 0,
        daily_reset_at: new Date().toISOString(),
        subscription_status: 'free',
      };
      await supabase.from('user_settings').insert(initialSettings);
      return DEFAULT_SETTINGS;
    }

    const settings: UserSettings = {
      level: (data.level as CEFRLevel) || 'B2',
      daily_reviews_used: data.daily_reviews_used ?? 0,
      daily_reset_at: data.daily_reset_at || new Date().toISOString(),
      subscription_status: data.subscription_status || 'free',
    };

    // If day changed, persist reset to DB
    const resetChecked = checkDailyReset(settings);
    if (resetChecked.daily_reviews_used !== settings.daily_reviews_used) {
      await saveUserSettings(userId, resetChecked);
    }

    return resetChecked;
  } catch (err) {
    console.error('Failed to get user settings from Supabase:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update user_settings in Supabase
 */
export async function saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        level: settings.level,
        daily_reviews_used: settings.daily_reviews_used,
        daily_reset_at: settings.daily_reset_at,
        subscription_status: settings.subscription_status,
      });

    if (error) console.error('Error saving user_settings:', error);
  } catch (err) {
    console.error('Failed to save user_settings:', err);
  }
}

/**
 * Fetch all word progress records for the user from Supabase user_progress table
 */
export async function getUserProgressMap(userId: string): Promise<Record<string, UserProgress>> {
  if (!isSupabaseConfigured()) return {};

  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user_progress:', error);
      return {};
    }

    const map: Record<string, UserProgress> = {};
    (data || []).forEach((row) => {
      map[row.word_id] = {
        id: row.id,
        user_id: row.user_id,
        word_id: row.word_id,
        ease_factor: Number(row.ease_factor ?? 2.5),
        interval_minutes: Number(row.interval_minutes ?? 1),
        next_review: row.next_review,
        last_reviewed: row.last_reviewed,
        review_count: Number(row.review_count ?? 0),
        last_rating: (row.last_rating as UserProgress['last_rating']) ?? null,
        created_at: row.created_at,
      };
    });

    return map;
  } catch (err) {
    console.error('Failed to fetch user_progress:', err);
    return {};
  }
}

/**
 * Record a review in Supabase user_progress and increment user_settings.daily_reviews_used.
 * Uses a single upsert keyed on the (user_id, word_id) unique constraint.
 */
export async function recordReviewInDB(
  userId: string,
  wordId: string,
  rating: ReviewRating,
  currentProgress?: UserProgress,
  currentSettings?: UserSettings
): Promise<{ progress: UserProgress; settings: UserSettings }> {
  const sm2 = calculateNextReview(currentProgress, rating);
  const now = new Date().toISOString();

  const updatedProgress: UserProgress = {
    id: currentProgress?.id,
    user_id: userId,
    word_id: wordId,
    ease_factor: sm2.easeFactor,
    interval_minutes: sm2.intervalMinutes,
    next_review: sm2.nextReview,
    last_reviewed: now,
    review_count: sm2.reviewCount,
    last_rating: rating,
    created_at: currentProgress?.created_at || now,
  };

  const activeSettings = currentSettings || (await getUserSettings(userId));
  const updatedSettings: UserSettings = {
    ...activeSettings,
    daily_reviews_used: (activeSettings.daily_reviews_used || 0) + 1,
  };

  if (isSupabaseConfigured()) {
    const payload = {
      user_id: userId,
      word_id: wordId,
      ease_factor: updatedProgress.ease_factor,
      interval_minutes: updatedProgress.interval_minutes,
      next_review: updatedProgress.next_review,
      last_reviewed: updatedProgress.last_reviewed,
      review_count: updatedProgress.review_count,
      last_rating: updatedProgress.last_rating,
    };

    // Single upsert keyed on the (user_id, word_id) unique constraint —
    // inserts a new row if none exists, or updates the existing one otherwise.
    const { data: upsertedRow, error: upsertErr } = await supabase
      .from('user_progress')
      .upsert(payload, { onConflict: 'user_id,word_id' })
      .select('id')
      .single();

    if (upsertErr) {
      console.error('Failed to persist to user_progress:', upsertErr);
    } else if (upsertedRow) {
      updatedProgress.id = upsertedRow.id;
    }

    await saveUserSettings(userId, updatedSettings);
  }

  return { progress: updatedProgress, settings: updatedSettings };
}

/**
 * Clear all progress and reset settings for user in Supabase
 */
export async function resetUserDataInDB(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    await supabase.from('user_progress').delete().eq('user_id', userId);
    await supabase.from('user_settings').update({
      daily_reviews_used: 0,
      daily_reset_at: new Date().toISOString(),
    }).eq('user_id', userId);
  } catch (err) {
    console.error('Failed to reset user data in Supabase:', err);
  }
}
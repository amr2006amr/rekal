import { SupabaseClient } from '@supabase/supabase-js';
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
 * Fetch or initialize settings from Supabase user_settings table.
 *
 * `client` defaults to the shared browser client (unchanged behavior for
 * every existing caller). Server-side API routes pass in a client created
 * with `createAuthedClient(token)` instead, so this runs under the correct
 * user's Row Level Security identity rather than as the anonymous role.
 */
export async function getUserSettings(
  userId: string,
  client: SupabaseClient = supabase
): Promise<UserSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS;

  try {
    const { data, error } = await client
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
      await client.from('user_settings').insert(initialSettings);
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
      await saveUserSettings(userId, resetChecked, client);
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
export async function saveUserSettings(
  userId: string,
  settings: UserSettings,
  client: SupabaseClient = supabase
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await client
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
 * Fetch all word progress records for the user from Supabase user_progress table.
 *
 * This pulls the user's ENTIRE review history in one go. That's the right
 * tool when you genuinely need the full picture — e.g. building the review
 * queue once when the /review page loads (buildReviewQueue needs to check
 * every word's due date). It is deliberately NOT used for single-word
 * lookups (like recording one review) because the cost of this query grows
 * with the user's total review history — see getUserProgressForWord below
 * for that case.
 */
export async function getUserProgressMap(
  userId: string,
  client: SupabaseClient = supabase
): Promise<Record<string, UserProgress>> {
  if (!isSupabaseConfigured()) return {};

  try {
    const { data, error } = await client
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
 * Fetch a SINGLE word's progress record for the user, directly filtered by
 * (user_id, word_id) at the database level.
 *
 * Use this instead of getUserProgressMap() whenever only one word's
 * progress is needed (e.g. recording a single review). The user_progress
 * table already has a unique constraint on (user_id, word_id) — see the
 * `onConflict: 'user_id,word_id'` upsert in recordReviewInDB — so Postgres
 * has an index backing this exact lookup and the query cost stays constant
 * (roughly O(1)) no matter how many words the user has reviewed in total.
 * getUserProgressMap, by contrast, transfers and parses every row the user
 * has ever reviewed just to discard all but one — that cost grows linearly
 * with review history and was the actual cause of increasing per-rating
 * latency in /api/review.
 */
export async function getUserProgressForWord(
  userId: string,
  wordId: string,
  client: SupabaseClient = supabase
): Promise<UserProgress | undefined> {
  if (!isSupabaseConfigured()) return undefined;

  try {
    const { data, error } = await client
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('word_id', wordId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching single user_progress row:', error);
      return undefined;
    }

    if (!data) return undefined;

    return {
      id: data.id,
      user_id: data.user_id,
      word_id: data.word_id,
      ease_factor: Number(data.ease_factor ?? 2.5),
      interval_minutes: Number(data.interval_minutes ?? 1),
      next_review: data.next_review,
      last_reviewed: data.last_reviewed,
      review_count: Number(data.review_count ?? 0),
      last_rating: (data.last_rating as UserProgress['last_rating']) ?? null,
      created_at: data.created_at,
    };
  } catch (err) {
    console.error('Failed to fetch single user_progress row:', err);
    return undefined;
  }
}

/**
 * Record a review in Supabase user_progress and increment user_settings.daily_reviews_used.
 * Uses a single upsert keyed on the (user_id, word_id) unique constraint.
 *
 * IMPORTANT: this function does NOT enforce the daily free-tier limit — it
 * only records whatever review it's told to record. The limit check happens
 * in /app/api/review/route.ts, BEFORE this is called, using settings that
 * route just re-read from the database itself. Do not call this directly
 * from client-side code with client-supplied settings, or the limit check
 * is trivially bypassed.
 */
export async function recordReviewInDB(
  userId: string,
  wordId: string,
  rating: ReviewRating,
  currentProgress?: UserProgress,
  currentSettings?: UserSettings,
  client: SupabaseClient = supabase
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

  const activeSettings = currentSettings || (await getUserSettings(userId, client));
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

    // The progress upsert and the settings save are independent writes —
    // neither depends on the other's result — so they run concurrently
    // instead of one waiting on the other, cutting the write-side latency
    // roughly in half.
    const [upsertResult] = await Promise.all([
      client
        .from('user_progress')
        .upsert(payload, { onConflict: 'user_id,word_id' })
        .select('id')
        .single(),
      saveUserSettings(userId, updatedSettings, client),
    ]);

    const { data: upsertedRow, error: upsertErr } = upsertResult;

    if (upsertErr) {
      console.error('Failed to persist to user_progress:', upsertErr);
    } else if (upsertedRow) {
      updatedProgress.id = upsertedRow.id;
    }
  }

  return { progress: updatedProgress, settings: updatedSettings };
}

/**
 * Clear a user's learned-word history (SM2 progress) in Supabase.
 *
 * IMPORTANT: this deliberately does NOT touch daily_reviews_used or
 * daily_reset_at. Those two fields are the free-tier daily usage counter,
 * not "learning progress" — resetting them here would let a free user who
 * hit the daily cap just click "reset my data" to instantly farm another
 * full batch of reviews, as many times as they want in one day. The
 * counter must only ever change via the midnight rollover in
 * checkDailyReset() or by recordReviewInDB() incrementing it.
 */
export async function resetUserDataInDB(
  userId: string,
  client: SupabaseClient = supabase
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    await client.from('user_progress').delete().eq('user_id', userId);
  } catch (err) {
    console.error('Failed to reset user data in Supabase:', err);
  }
}
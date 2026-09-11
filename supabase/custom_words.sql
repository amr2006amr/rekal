-- =============================================================================
-- Rekal (رِكال) - User Custom Words & AI Generation Usage Schema
-- =============================================================================
-- This script creates:
-- 1. `user_custom_words`: Stores custom English words added by users.
-- 2. `custom_word_usage`: Tracks daily AI generation attempts & usage limits.
-- 3. Row Level Security (RLS) policies matching existing user_settings & user_progress.
-- 4. Atomic Postgres functions for quota verification, attempt counters, and status inspection.
-- Run this script in the Supabase SQL Editor.
-- =============================================================================

-- =============================================================================
-- 1. Table: user_custom_words
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_custom_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  level TEXT NOT NULL,
  part_of_speech TEXT NOT NULL,
  pronunciation TEXT,
  definition_ar TEXT NOT NULL,
  definition_en TEXT NOT NULL,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_custom_words_user_word UNIQUE (user_id, word)
);

COMMENT ON TABLE public.user_custom_words IS 'Custom vocabulary items created by users, outside the static dictionary.';
COMMENT ON COLUMN public.user_custom_words.id IS 'Primary key UUID for the custom word.';
COMMENT ON COLUMN public.user_custom_words.user_id IS 'Owner of the custom word, references auth.users(id).';
COMMENT ON COLUMN public.user_custom_words.word IS 'The normalized English word.';
COMMENT ON COLUMN public.user_custom_words.level IS 'Approximate CEFR level (A1, A2, B1, B2, C1) determined by AI.';
COMMENT ON COLUMN public.user_custom_words.part_of_speech IS 'Grammatical category (noun, verb, adjective, etc.).';
COMMENT ON COLUMN public.user_custom_words.pronunciation IS 'IPA or phonetic pronunciation guide (optional).';
COMMENT ON COLUMN public.user_custom_words.definition_ar IS 'Arabic definition/explanation.';
COMMENT ON COLUMN public.user_custom_words.definition_en IS 'English definition.';
COMMENT ON COLUMN public.user_custom_words.examples IS 'Array of JSON objects with {sentence, translation_ar}.';

-- Index on (user_id, lower(word)) for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_custom_words_user_word ON public.user_custom_words (user_id, lower(word));

-- Enable Row Level Security (RLS) for user_custom_words
ALTER TABLE public.user_custom_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own custom words" ON public.user_custom_words;
DROP POLICY IF EXISTS "Users can insert own custom words" ON public.user_custom_words;
DROP POLICY IF EXISTS "Users can update own custom words" ON public.user_custom_words;
DROP POLICY IF EXISTS "Users can delete own custom words" ON public.user_custom_words;

CREATE POLICY "Users can read own custom words"
  ON public.user_custom_words
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom words"
  ON public.user_custom_words
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom words"
  ON public.user_custom_words
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom words"
  ON public.user_custom_words
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- =============================================================================
-- 2. Table: custom_word_usage
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.custom_word_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_attempts INT NOT NULL DEFAULT 0,
  pro_words_today INT NOT NULL DEFAULT 0,
  free_words_total INT NOT NULL DEFAULT 0,
  daily_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.custom_word_usage IS 'Tracks AI word generation attempts and quota per user.';
COMMENT ON COLUMN public.custom_word_usage.daily_attempts IS 'Total generation attempts today (valid or invalid) with midnight UTC reset.';
COMMENT ON COLUMN public.custom_word_usage.pro_words_today IS 'Successfully generated AI words today for PRO users with midnight UTC reset.';
COMMENT ON COLUMN public.custom_word_usage.free_words_total IS 'Cumulative total of successfully generated AI words for free-tier users.';
COMMENT ON COLUMN public.custom_word_usage.daily_reset_at IS 'Timestamp of the last midnight UTC rollover.';

-- Enable Row Level Security (RLS) for custom_word_usage
ALTER TABLE public.custom_word_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own custom word usage" ON public.custom_word_usage;
DROP POLICY IF EXISTS "Users can insert own custom word usage" ON public.custom_word_usage;
DROP POLICY IF EXISTS "Users can update own custom word usage" ON public.custom_word_usage;

CREATE POLICY "Users can read own custom word usage"
  ON public.custom_word_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom word usage"
  ON public.custom_word_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom word usage"
  ON public.custom_word_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =============================================================================
-- 3. Atomic check-and-record attempt function
-- =============================================================================
-- Checks if the user is allowed to make a generation attempt.
-- If allowed, increments `daily_attempts` by 1 atomically.
-- Does NOT increment words generated (that only happens when AI returns valid: true).
CREATE OR REPLACE FUNCTION public.check_and_record_custom_word_attempt(
  p_user_id UUID,
  p_is_pro BOOLEAN,
  p_attempts_limit INT,
  p_pro_daily_limit INT,
  p_free_total_limit INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_usage RECORD;
  v_is_new_day BOOLEAN := FALSE;
  v_current_attempts INT := 0;
  v_pro_words INT := 0;
  v_free_total INT := 0;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Strict security check: caller must be authenticated and match p_user_id
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'error', 'unauthorized'
    );
  END IF;

  -- Ensure record exists for this user
  INSERT INTO public.custom_word_usage (user_id, daily_attempts, pro_words_today, free_words_total, daily_reset_at, created_at, updated_at)
  VALUES (p_user_id, 0, 0, 0, v_now, v_now, v_now)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock row exclusively during transaction
  SELECT * INTO v_usage
  FROM public.custom_word_usage
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if calendar day rolled over (midnight UTC)
  IF (v_now AT TIME ZONE 'UTC')::date != (v_usage.daily_reset_at AT TIME ZONE 'UTC')::date THEN
    v_is_new_day := TRUE;
    v_current_attempts := 0;
    v_pro_words := 0;
  ELSE
    v_current_attempts := v_usage.daily_attempts;
    v_pro_words := v_usage.pro_words_today;
  END IF;

  v_free_total := v_usage.free_words_total;

  -- 1. Check daily attempts limit (anti-abuse)
  IF v_current_attempts >= p_attempts_limit THEN
    IF v_is_new_day THEN
      UPDATE public.custom_word_usage
      SET daily_attempts = 0,
          pro_words_today = 0,
          daily_reset_at = v_now,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
      'allowed', FALSE,
      'error', 'daily_attempts_limit_reached',
      'daily_attempts', v_current_attempts,
      'attempts_limit', p_attempts_limit
    );
  END IF;

  -- 2. Check quota limit based on subscription tier
  IF p_is_pro THEN
    IF v_pro_words >= p_pro_daily_limit THEN
      IF v_is_new_day THEN
        UPDATE public.custom_word_usage
        SET daily_attempts = 0,
            pro_words_today = 0,
            daily_reset_at = v_now,
            updated_at = v_now
        WHERE user_id = p_user_id;
      END IF;

      RETURN jsonb_build_object(
        'allowed', FALSE,
        'error', 'pro_daily_limit_reached',
        'pro_words_today', v_pro_words,
        'pro_daily_limit', p_pro_daily_limit
      );
    END IF;
  ELSE
    IF v_free_total >= p_free_total_limit THEN
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'error', 'free_total_limit_reached',
        'free_words_total', v_free_total,
        'free_total_limit', p_free_total_limit
      );
    END IF;
  END IF;

  -- Increment daily attempts atomically
  UPDATE public.custom_word_usage
  SET daily_attempts = v_current_attempts + 1,
      pro_words_today = CASE WHEN v_is_new_day THEN 0 ELSE v_usage.pro_words_today END,
      daily_reset_at = CASE WHEN v_is_new_day THEN v_now ELSE v_usage.daily_reset_at END,
      updated_at = v_now
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'daily_attempts', v_current_attempts + 1,
    'attempts_limit', p_attempts_limit,
    'attempts_remaining', GREATEST(0, p_attempts_limit - (v_current_attempts + 1)),
    'pro_words_today', CASE WHEN v_is_new_day THEN 0 ELSE v_usage.pro_words_today END,
    'free_words_total', v_free_total
  );
END;
$func$;


-- =============================================================================
-- 4. Atomic record generated word success function
-- =============================================================================
-- Called when Gemini successfully generates a valid word (valid: true).
-- Increments pro_words_today (if PRO) or free_words_total (if Free).
CREATE OR REPLACE FUNCTION public.record_custom_word_success(
  p_user_id UUID,
  p_is_pro BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_usage RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_is_new_day BOOLEAN := FALSE;
  v_pro_words INT := 0;
  v_free_total INT := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'error', 'unauthorized'
    );
  END IF;

  INSERT INTO public.custom_word_usage (user_id, daily_attempts, pro_words_today, free_words_total, daily_reset_at, created_at, updated_at)
  VALUES (p_user_id, 0, 0, 0, v_now, v_now, v_now)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_usage
  FROM public.custom_word_usage
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF (v_now AT TIME ZONE 'UTC')::date != (v_usage.daily_reset_at AT TIME ZONE 'UTC')::date THEN
    v_is_new_day := TRUE;
    v_pro_words := 0;
  ELSE
    v_pro_words := v_usage.pro_words_today;
  END IF;

  v_free_total := v_usage.free_words_total;

  IF p_is_pro THEN
    UPDATE public.custom_word_usage
    SET pro_words_today = v_pro_words + 1,
        daily_reset_at = CASE WHEN v_is_new_day THEN v_now ELSE v_usage.daily_reset_at END,
        updated_at = v_now
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
      'success', TRUE,
      'pro_words_today', v_pro_words + 1,
      'free_words_total', v_free_total
    );
  ELSE
    UPDATE public.custom_word_usage
    SET free_words_total = v_free_total + 1,
        daily_reset_at = CASE WHEN v_is_new_day THEN v_now ELSE v_usage.daily_reset_at END,
        updated_at = v_now
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
      'success', TRUE,
      'pro_words_today', CASE WHEN v_is_new_day THEN 0 ELSE v_usage.pro_words_today END,
      'free_words_total', v_free_total + 1
    );
  END IF;
END;
$func$;


-- =============================================================================
-- 5. Function to inspect custom word usage (for UI/status display)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_custom_word_usage(
  p_user_id UUID,
  p_is_pro BOOLEAN,
  p_attempts_limit INT,
  p_pro_daily_limit INT,
  p_free_total_limit INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_usage RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_current_attempts INT := 0;
  v_pro_words INT := 0;
  v_free_total INT := 0;
  v_quota_limit INT := 0;
  v_quota_used INT := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'error', 'unauthorized'
    );
  END IF;

  INSERT INTO public.custom_word_usage (user_id, daily_attempts, pro_words_today, free_words_total, daily_reset_at, created_at, updated_at)
  VALUES (p_user_id, 0, 0, 0, v_now, v_now, v_now)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_usage
  FROM public.custom_word_usage
  WHERE user_id = p_user_id;

  IF (v_now AT TIME ZONE 'UTC')::date != (v_usage.daily_reset_at AT TIME ZONE 'UTC')::date THEN
    UPDATE public.custom_word_usage
    SET daily_attempts = 0,
        pro_words_today = 0,
        daily_reset_at = v_now,
        updated_at = v_now
    WHERE user_id = p_user_id;

    v_current_attempts := 0;
    v_pro_words := 0;
  ELSE
    v_current_attempts := v_usage.daily_attempts;
    v_pro_words := v_usage.pro_words_today;
  END IF;

  v_free_total := v_usage.free_words_total;

  IF p_is_pro THEN
    v_quota_limit := p_pro_daily_limit;
    v_quota_used := v_pro_words;
  ELSE
    v_quota_limit := p_free_total_limit;
    v_quota_used := v_free_total;
  END IF;

  RETURN jsonb_build_object(
    'is_pro', p_is_pro,
    'daily_attempts', v_current_attempts,
    'attempts_limit', p_attempts_limit,
    'attempts_remaining', GREATEST(0, p_attempts_limit - v_current_attempts),
    'quota_used', v_quota_used,
    'quota_limit', v_quota_limit,
    'quota_remaining', GREATEST(0, v_quota_limit - v_quota_used),
    'allowed', (v_current_attempts < p_attempts_limit AND v_quota_used < v_quota_limit)
  );
END;
$func$;

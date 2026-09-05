-- =============================================================================
-- Rekal (رِكال) - Chat Usage & Daily Limits Schema
-- =============================================================================
-- This script creates the `chat_usage` table, configures Row Level Security (RLS),
-- and defines atomic Postgres functions for checking and incrementing chat quota.
-- Run this script in the Supabase SQL Editor.
-- =============================================================================

-- 1. Create chat_usage table
CREATE TABLE IF NOT EXISTS public.chat_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  messages_used_today INT NOT NULL DEFAULT 0,
  daily_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.chat_usage IS 'Tracks daily AI chat message usage per user with midnight UTC rollover.';
COMMENT ON COLUMN public.chat_usage.user_id IS 'References auth.users(id) - owner of the quota record.';
COMMENT ON COLUMN public.chat_usage.messages_used_today IS 'Count of AI chat queries sent today.';
COMMENT ON COLUMN public.chat_usage.daily_reset_at IS 'Timestamp of the last reset date/time.';

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can read own chat usage" ON public.chat_usage;
DROP POLICY IF EXISTS "Users can insert own chat usage" ON public.chat_usage;
DROP POLICY IF EXISTS "Users can update own chat usage" ON public.chat_usage;

-- RLS Policies matching user_settings and user_progress:
CREATE POLICY "Users can read own chat usage"
  ON public.chat_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat usage"
  ON public.chat_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat usage"
  ON public.chat_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Atomic check-and-increment function
-- Prevents race conditions when a user sends multiple requests concurrently.
-- Executes in a single transaction with row-level locking (SELECT ... FOR UPDATE).
CREATE OR REPLACE FUNCTION public.check_and_increment_chat_usage(
  p_user_id UUID,
  p_daily_limit INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_usage RECORD;
  v_is_new_day BOOLEAN := FALSE;
  v_current_count INT := 0;
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
  INSERT INTO public.chat_usage (user_id, messages_used_today, daily_reset_at, created_at, updated_at)
  VALUES (p_user_id, 0, v_now, v_now, v_now)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock row exclusively for this user during transaction to prevent race conditions
  SELECT * INTO v_usage
  FROM public.chat_usage
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if calendar day rolled over (midnight UTC, matching checkDailyReset in codebase)
  IF (v_now AT TIME ZONE 'UTC')::date != (v_usage.daily_reset_at AT TIME ZONE 'UTC')::date THEN
    v_is_new_day := TRUE;
    v_current_count := 0;
  ELSE
    v_current_count := v_usage.messages_used_today;
  END IF;

  -- Enforce daily limit
  IF v_current_count >= p_daily_limit THEN
    -- If a new day has arrived, save the reset timestamp even if limit was 0
    IF v_is_new_day THEN
      UPDATE public.chat_usage
      SET messages_used_today = 0,
          daily_reset_at = v_now,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
      'allowed', FALSE,
      'error', 'daily_limit_reached',
      'messages_used_today', v_current_count,
      'daily_limit', p_daily_limit,
      'remaining', 0
    );
  END IF;

  -- Under limit: increment count and record update
  UPDATE public.chat_usage
  SET messages_used_today = v_current_count + 1,
      daily_reset_at = CASE WHEN v_is_new_day THEN v_now ELSE v_usage.daily_reset_at END,
      updated_at = v_now
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'messages_used_today', v_current_count + 1,
    'daily_limit', p_daily_limit,
    'remaining', p_daily_limit - (v_current_count + 1)
  );
END;
$func$;

-- 4. Function to inspect current usage without incrementing (for UI status display)
CREATE OR REPLACE FUNCTION public.get_chat_usage(
  p_user_id UUID,
  p_daily_limit INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_usage RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_current_count INT := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'error', 'unauthorized'
    );
  END IF;

  -- Ensure record exists
  INSERT INTO public.chat_usage (user_id, messages_used_today, daily_reset_at, created_at, updated_at)
  VALUES (p_user_id, 0, v_now, v_now, v_now)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_usage
  FROM public.chat_usage
  WHERE user_id = p_user_id;

  -- Check if calendar day rolled over
  IF (v_now AT TIME ZONE 'UTC')::date != (v_usage.daily_reset_at AT TIME ZONE 'UTC')::date THEN
    -- Persist the rollover
    UPDATE public.chat_usage
    SET messages_used_today = 0,
        daily_reset_at = v_now,
        updated_at = v_now
    WHERE user_id = p_user_id;
    v_current_count := 0;
  ELSE
    v_current_count := v_usage.messages_used_today;
  END IF;

  RETURN jsonb_build_object(
    'allowed', (v_current_count < p_daily_limit),
    'messages_used_today', v_current_count,
    'daily_limit', p_daily_limit,
    'remaining', GREATEST(0, p_daily_limit - v_current_count)
  );
END;
$func$;

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key'
  );
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
);

/**
 * Creates a Supabase client scoped to a specific user's access token, for
 * use in server-side API routes (where there is no browser session to rely
 * on).
 *
 * Why this matters: an API route that just imports the plain `supabase`
 * client above and calls `.from(...).update(...)` runs as the anonymous
 * role — Postgres Row Level Security has no `auth.uid()` to check against,
 * so a policy like `using (auth.uid() = user_id)` would either silently
 * update zero rows, or (if the policy is looser than that) update ANY
 * user's row. Forwarding the caller's own JWT as the Authorization header
 * makes PostgREST evaluate RLS exactly as if the browser had called
 * Supabase directly while signed in as that user.
 */
export function createAuthedClient(accessToken: string): SupabaseClient {
  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
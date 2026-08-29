import { createClient } from '@supabase/supabase-js';

/**
 * SERVER-ONLY client that uses the Supabase service role key.
 *
 * This bypasses Row Level Security, so it must NEVER be imported into a
 * 'use client' component or any file that ships to the browser. It exists
 * only for the webhook handler, which has no logged-in user session and
 * needs to update *other* users' subscription rows.
 *
 * SUPABASE_SERVICE_ROLE_KEY must NOT have the NEXT_PUBLIC_ prefix, or it
 * will be bundled into client-side JavaScript and leak to anyone who views
 * page source.
 */
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin client is not configured: missing URL or service role key');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
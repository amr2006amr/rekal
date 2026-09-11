import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthedClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const CUSTOM_WORD_DAILY_ATTEMPTS_LIMIT = parseInt(
  process.env.CUSTOM_WORD_DAILY_ATTEMPTS_LIMIT || '30',
  10
);
const CUSTOM_WORD_FREE_TOTAL_LIMIT = parseInt(
  process.env.CUSTOM_WORD_FREE_TOTAL_LIMIT || '10',
  10
);
const CUSTOM_WORD_PRO_DAILY_LIMIT = parseInt(
  process.env.CUSTOM_WORD_PRO_DAILY_LIMIT || '20',
  10
);

/**
 * GET /api/custom-word/usage
 * Returns the current user's generation quota status, attempts remaining, and limits.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authedClient = createAuthedClient(token);

    const { data: settingsData } = await authedClient
      .from('user_settings')
      .select('subscription_status')
      .eq('user_id', user.id)
      .maybeSingle();

    const isPro = settingsData?.subscription_status === 'active';

    const { data: usageData, error: rpcError } = await authedClient.rpc(
      'get_custom_word_usage',
      {
        p_user_id: user.id,
        p_is_pro: isPro,
        p_attempts_limit: CUSTOM_WORD_DAILY_ATTEMPTS_LIMIT,
        p_pro_daily_limit: CUSTOM_WORD_PRO_DAILY_LIMIT,
        p_free_total_limit: CUSTOM_WORD_FREE_TOTAL_LIMIT,
      }
    );

    if (rpcError) {
      console.error('get_custom_word_usage RPC error:', rpcError);
      return NextResponse.json(
        {
          is_pro: isPro,
          daily_attempts: 0,
          attempts_limit: CUSTOM_WORD_DAILY_ATTEMPTS_LIMIT,
          attempts_remaining: CUSTOM_WORD_DAILY_ATTEMPTS_LIMIT,
          quota_used: 0,
          quota_limit: isPro ? CUSTOM_WORD_PRO_DAILY_LIMIT : CUSTOM_WORD_FREE_TOTAL_LIMIT,
          quota_remaining: isPro ? CUSTOM_WORD_PRO_DAILY_LIMIT : CUSTOM_WORD_FREE_TOTAL_LIMIT,
          allowed: true,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(usageData);
  } catch (err: any) {
    console.error('Error in /api/custom-word/usage:', err);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}

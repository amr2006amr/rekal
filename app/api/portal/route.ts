import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthedClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // The user id always comes from the verified token, never from the body.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read with the user's own client so RLS applies: a user can only ever
    // see their own subscription id.
    const authed = createAuthedClient(token);
    const { data: row, error: dbError } = await authed
      .from('user_settings')
      .select('ls_subscription_id')
      .eq('user_id', user.id)
      .single();

    if (dbError || !row?.ls_subscription_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(row.ls_subscription_id)}`,
      {
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      console.error('Lemon Squeezy subscription fetch failed:', res.status);
      return NextResponse.json({ error: 'Failed to load subscription' }, { status: 502 });
    }

    const json = await res.json();
    // Signed link, valid for 24 hours, logs the customer in automatically.
    const url: string | undefined = json?.data?.attributes?.urls?.customer_portal;
    if (!url) {
      return NextResponse.json({ error: 'Portal unavailable' }, { status: 502 });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error('Error in /api/portal:', err);
    return NextResponse.json({ error: 'Failed to open portal' }, { status: 500 });
  }
}
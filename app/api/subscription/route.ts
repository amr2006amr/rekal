import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthedClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const LS_BASE = 'https://api.lemonsqueezy.com/v1/subscriptions';

function lsHeaders() {
  return {
    Accept: 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
    Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
  };
}

/**
 * Verifies the Bearer token with Supabase, then reads the caller's OWN
 * subscription id through an RLS-scoped client. The user id is never taken
 * from the request body, so nobody can touch someone else's subscription.
 */
async function getCallerSubscriptionId(
  request: NextRequest
): Promise<{ subId: string } | { response: NextResponse }> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!token) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const authed = createAuthedClient(token);
  const { data: row, error } = await authed
    .from('user_settings')
    .select('ls_subscription_id')
    .eq('user_id', user.id)
    .single();

  if (error || !row?.ls_subscription_id) {
    return { response: NextResponse.json({ error: 'No subscription found' }, { status: 404 }) };
  }

  return { subId: String(row.ls_subscription_id) };
}

function summarize(json: any) {
  const a = json?.data?.attributes ?? {};
  return {
    cancelled: Boolean(a.cancelled),
    status: a.status ?? null,
    renewsAt: a.renews_at ?? null,
    endsAt: a.ends_at ?? null,
  };
}

// GET: current state of the subscription (renewing or cancelled, and when).
export async function GET(request: NextRequest) {
  try {
    const caller = await getCallerSubscriptionId(request);
    if ('response' in caller) return caller.response;

    const res = await fetch(`${LS_BASE}/${encodeURIComponent(caller.subId)}`, {
      headers: lsHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('LS subscription fetch failed:', res.status);
      return NextResponse.json({ error: 'Failed to load subscription' }, { status: 502 });
    }
    return NextResponse.json(summarize(await res.json()));
  } catch (err) {
    console.error('Error in GET /api/subscription:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE: cancel auto-renewal. Access stays until the end of the paid period;
// the webhook downgrades the user when Lemon Squeezy sends subscription_expired.
export async function DELETE(request: NextRequest) {
  try {
    const caller = await getCallerSubscriptionId(request);
    if ('response' in caller) return caller.response;

    const res = await fetch(`${LS_BASE}/${encodeURIComponent(caller.subId)}`, {
      method: 'DELETE',
      headers: lsHeaders(),
    });
    if (!res.ok) {
      console.error('LS subscription cancel failed:', res.status);
      return NextResponse.json({ error: 'Failed to cancel' }, { status: 502 });
    }
    return NextResponse.json(summarize(await res.json()));
  } catch (err) {
    console.error('Error in DELETE /api/subscription:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH: undo a cancellation (resume) while the paid period is still running.
export async function PATCH(request: NextRequest) {
  try {
    const caller = await getCallerSubscriptionId(request);
    if ('response' in caller) return caller.response;

    const res = await fetch(`${LS_BASE}/${encodeURIComponent(caller.subId)}`, {
      method: 'PATCH',
      headers: lsHeaders(),
      body: JSON.stringify({
        data: { type: 'subscriptions', id: caller.subId, attributes: { cancelled: false } },
      }),
    });
    if (!res.ok) {
      console.error('LS subscription resume failed:', res.status);
      return NextResponse.json({ error: 'Failed to resume' }, { status: 502 });
    }
    return NextResponse.json(summarize(await res.json()));
  } catch (err) {
    console.error('Error in PATCH /api/subscription:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
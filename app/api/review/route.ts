import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthedClient } from '@/lib/supabase/client';
import { getUserSettings, getUserProgressForWord, recordReviewInDB } from '@/lib/services/supabaseService';
import { DAILY_FREE_LIMIT } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate the token and derive the user id from it — this works
    // statelessly (no persisted session needed) and, crucially, we never
    // trust a user_id sent in the request body.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const wordId = body?.wordId;
    const rating = body?.rating;

    if (typeof wordId !== 'string' || !wordId.trim()) {
      return NextResponse.json({ error: 'Invalid wordId' }, { status: 400 });
    }
    if (typeof rating !== 'string' || !rating.trim()) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }

    // A client scoped to THIS user's token, so Row Level Security evaluates
    // the request as coming from them (auth.uid() = user.id) instead of the
    // anonymous role — same effective access as the browser's own session.
    const authedClient = createAuthedClient(token);

    // Always re-read settings fresh from the database — this is the actual
    // enforcement point: subscription_status and daily_reviews_used here
    // can only be what's really stored for this user, never a value the
    // client claims. This function also applies the midnight daily reset
    // if needed.
    //
    // We fetch this word's existing progress in the same breath. Never
    // trust SM2 scheduling state (ease factor, interval, etc.) sent from
    // the client, since a forged "brand new word" state could be used to
    // manipulate the review queue or the daily count indirectly.
    //
    // These two reads are independent of each other (settings vs. a single
    // progress row), so they run concurrently with Promise.all instead of
    // one waiting on the other — this halves the network round-trip time
    // spent on reads before we can even check the daily limit. The
    // progress lookup is also a targeted (user_id, word_id) query rather
    // than pulling the user's entire review history — see
    // getUserProgressForWord's doc comment — so latency here stays
    // constant regardless of how many words the user has reviewed in total.
    const [settings, currentProgress] = await Promise.all([
      getUserSettings(user.id, authedClient),
      getUserProgressForWord(user.id, wordId, authedClient),
    ]);

    const isPro = settings.subscription_status === 'active';
    if (!isPro && (settings.daily_reviews_used || 0) >= DAILY_FREE_LIMIT) {
      return NextResponse.json(
        { error: 'daily_limit_reached', limit: DAILY_FREE_LIMIT },
        { status: 403 }
      );
    }

    const result = await recordReviewInDB(
      user.id,
      wordId,
      rating as any,
      currentProgress,
      settings,
      authedClient
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in /api/review:', err);
    return NextResponse.json({ error: 'Failed to record review' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthedClient } from '@/lib/supabase/client';

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
    // It's also what makes auth.uid() resolve correctly *inside* the
    // record_review() Postgres function below.
    const authedClient = createAuthedClient(token);

    // Everything that used to be 3 sequential round trips to Supabase
    // (getUserSettings -> getUserProgressForWord -> upsert + saveSettings)
    // now happens in ONE round trip: the daily-reset check, the daily-limit
    // enforcement, the SM2 calculation, the progress upsert, and the
    // counter increment all run together inside record_review(), in a
    // single Postgres transaction. See record_review.sql for the full
    // logic (it's a line-by-line port of calculateNextReview() and
    // recordReviewInDB() — nothing about the scheduling math or the
    // free-tier limit rule changed, only where it executes).
    const { data, error: rpcError } = await authedClient.rpc('record_review', {
      p_user_id: user.id,
      p_word_id: wordId,
      p_rating: rating,
    });

    if (rpcError) {
      console.error('record_review RPC error:', rpcError);
      return NextResponse.json({ error: 'Failed to record review' }, { status: 500 });
    }

    if (data?.error === 'daily_limit_reached') {
      return NextResponse.json(
        { error: 'daily_limit_reached', limit: data.limit },
        { status: 403 }
      );
    }

    return NextResponse.json({ progress: data.progress, settings: data.settings });
  } catch (err: any) {
    console.error('Error in /api/review:', err);
    return NextResponse.json({ error: 'Failed to record review' }, { status: 500 });
  }
}
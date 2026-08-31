import { NextRequest, NextResponse } from 'next/server';
import { getWordsForLevel, getAllWords } from '@/lib/data/words';
import { getUserSettings, getUserProgressMap } from '@/lib/services/supabaseService';
import { buildReviewQueue } from '@/lib/storage';
import { supabase, createAuthedClient } from '@/lib/supabase/client';
import { CEFRLevel } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as CEFRLevel | null;

    // Authenticated path: identity comes ONLY from a verified Bearer token,
    // never from a client-supplied userId query param — anyone could pass
    // any UUID there and read another user's settings/progress otherwise.
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();

    if (token) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Scoped to this user's token so RLS evaluates the request as them
      // (auth.uid() = user.id), same as /api/review.
      const authedClient = createAuthedClient(token);

      const settings = await getUserSettings(user.id, authedClient);
      const progressMap = await getUserProgressMap(user.id, authedClient);
      const targetLevel = level || settings.level;
      const queue = buildReviewQueue(targetLevel, progressMap);

      return NextResponse.json({
        level: targetLevel,
        settings,
        dueWords: queue,
      });
    }

    // Unauthenticated: return words for level or all — no personal data
    // is ever touched on this path, so no auth is required.
    const words = level ? getWordsForLevel(level) : getAllWords();
    return NextResponse.json({ words });
  } catch (error: any) {
    console.error('Error in /api/words route:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch words' },
      { status: 500 }
    );
  }
}
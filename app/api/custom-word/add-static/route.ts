import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthedClient } from '@/lib/supabase/client';
import { getWordById, findStaticWord } from '@/lib/data/words';
import { createInitialWordProgress } from '@/lib/services/supabaseService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/custom-word/add-static
 * Directly adds an existing static dictionary word to the user's review queue
 * by creating an initial due `user_progress` row without invoking AI.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => null);
    const wordId = body?.wordId;
    const wordText = body?.word;

    if (!wordId && !wordText) {
      return NextResponse.json(
        { error: 'wordId_or_word_required', message: 'Either wordId or word text is required.' },
        { status: 400 }
      );
    }

    // Guard against oversized input
    if (wordId && (typeof wordId !== 'string' || wordId.length > 100)) {
      return NextResponse.json({ error: 'Invalid wordId' }, { status: 400 });
    }
    if (wordText && (typeof wordText !== 'string' || wordText.length > 50)) {
      return NextResponse.json({ error: 'Invalid word text' }, { status: 400 });
    }

    // Find static word by id or text
    const staticWord = wordId ? getWordById(wordId) : findStaticWord(wordText);

    if (!staticWord) {
      return NextResponse.json(
        { error: 'word_not_found', message: 'Word not found in static dictionary.' },
        { status: 404 }
      );
    }

    const authedClient = createAuthedClient(token);

    // Create initial user_progress row with next_review = NOW()
    const initialProgress = await createInitialWordProgress(
      user.id,
      staticWord.id,
      authedClient
    );

    return NextResponse.json({
      success: true,
      word: staticWord,
      progress: initialProgress,
    });
  } catch (err: any) {
    console.error('Error in /api/custom-word/add-static:', err);
    return NextResponse.json(
      { error: 'internal_server_error', message: err?.message || 'Failed to add static word' },
      { status: 500 }
    );
  }
}

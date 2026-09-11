import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthedClient } from '@/lib/supabase/client';
import { saveUserCustomWord, createInitialWordProgress } from '@/lib/services/supabaseService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/custom-word/save
 * Saves the confirmed custom word into `user_custom_words`
 * and creates an initial due `user_progress` row so it enters the user's review queue immediately.
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
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const {
      word,
      level,
      part_of_speech,
      pronunciation,
      definition_ar,
      definition_en,
      examples,
    } = body;

    if (!word || typeof word !== 'string' || !word.trim()) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }
    if (!definition_ar || typeof definition_ar !== 'string') {
      return NextResponse.json({ error: 'Arabic definition is required' }, { status: 400 });
    }
    if (!definition_en || typeof definition_en !== 'string') {
      return NextResponse.json({ error: 'English definition is required' }, { status: 400 });
    }

    const authedClient = createAuthedClient(token);

    // 1. Insert or update custom word
    const savedWord = await saveUserCustomWord(
      user.id,
      {
        word: word.trim().toLowerCase(),
        level: level || 'B1',
        part_of_speech: part_of_speech || 'noun',
        pronunciation: pronunciation || '',
        definition_ar: definition_ar.trim(),
        definition_en: definition_en.trim(),
        examples: Array.isArray(examples) ? examples : [],
      },
      authedClient
    );

    if (!savedWord) {
      return NextResponse.json(
        { error: 'save_failed', message: 'Failed to save custom word' },
        { status: 500 }
      );
    }

    // 2. Create initial user_progress row with next_review = NOW()
    const initialProgress = await createInitialWordProgress(
      user.id,
      savedWord.id,
      authedClient
    );

    return NextResponse.json({
      success: true,
      word: savedWord,
      progress: initialProgress,
    });
  } catch (err: any) {
    console.error('Error in /api/custom-word/save:', err);
    return NextResponse.json(
      { error: 'internal_server_error', message: err?.message || 'Failed to save custom word' },
      { status: 500 }
    );
  }
}

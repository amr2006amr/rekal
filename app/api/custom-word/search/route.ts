import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthedClient } from '@/lib/supabase/client';
import { findStaticWord } from '@/lib/data/words';
import { getCustomWordByWord } from '@/lib/services/supabaseService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/custom-word/search
 * Searches for a word first in the static dictionary, then in the user's custom words.
 * Returns information without calling AI.
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
    const rawWord = body?.word;

    if (typeof rawWord !== 'string' || !rawWord.trim()) {
      return NextResponse.json({ error: 'Invalid or missing word' }, { status: 400 });
    }

    const normalized = rawWord.trim().toLowerCase();

    // 1. Search static dictionary
    const staticMatch = findStaticWord(normalized);
    if (staticMatch) {
      return NextResponse.json({
        found: true,
        source: 'static',
        message: 'Word exists in the standard curriculum',
        word: staticMatch,
      });
    }

    // 2. Search user's own custom words table
    const authedClient = createAuthedClient(token);
    const customMatch = await getCustomWordByWord(user.id, normalized, authedClient);
    if (customMatch) {
      return NextResponse.json({
        found: true,
        source: 'custom',
        message: 'Word already added to your custom vocabulary',
        word: customMatch,
      });
    }

    // 3. Not found in either
    return NextResponse.json({
      found: false,
      normalizedWord: normalized,
    });
  } catch (err: any) {
    console.error('Error in /api/custom-word/search:', err);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}

/**
 * GET /api/custom-word/search?word=...
 * Convenience query-param alternative to POST
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

    const { searchParams } = new URL(request.url);
    const rawWord = searchParams.get('word');

    if (!rawWord || !rawWord.trim()) {
      return NextResponse.json({ error: 'Invalid or missing word' }, { status: 400 });
    }

    const normalized = rawWord.trim().toLowerCase();

    const staticMatch = findStaticWord(normalized);
    if (staticMatch) {
      return NextResponse.json({
        found: true,
        source: 'static',
        message: 'Word exists in the standard curriculum',
        word: staticMatch,
      });
    }

    const authedClient = createAuthedClient(token);
    const customMatch = await getCustomWordByWord(user.id, normalized, authedClient);
    if (customMatch) {
      return NextResponse.json({
        found: true,
        source: 'custom',
        message: 'Word already added to your custom vocabulary',
        word: customMatch,
      });
    }

    return NextResponse.json({
      found: false,
      normalizedWord: normalized,
    });
  } catch (err: any) {
    console.error('Error in /api/custom-word/search (GET):', err);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}

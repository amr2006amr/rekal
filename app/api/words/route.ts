import { NextRequest, NextResponse } from 'next/server';
import { getWordsForLevel, getAllWords } from '@/lib/data/words';
import { getUserSettings, getUserProgressMap } from '@/lib/services/supabaseService';
import { buildReviewQueue } from '@/lib/storage';
import { CEFRLevel } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const level = searchParams.get('level') as CEFRLevel | null;

    if (userId) {
      const settings = await getUserSettings(userId);
      const progressMap = await getUserProgressMap(userId);
      const targetLevel = level || settings.level;
      const queue = buildReviewQueue(targetLevel, progressMap);

      return NextResponse.json({
        level: targetLevel,
        settings,
        dueWords: queue,
      });
    }

    // Unauthenticated: return words for level or all
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

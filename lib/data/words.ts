import { CEFRLevel, WordItem } from '@/types';
import wordsA1 from './words-a1.json';
import wordsA2 from './words-a2.json';
import wordsB1 from './words-b1.json';
import wordsB2 from './words-b2.json';
import wordsC1 from './words-c1.json';

export const ALL_WORDS_BY_LEVEL: Record<CEFRLevel, WordItem[]> = {
  A1: wordsA1 as WordItem[],
  A2: wordsA2 as WordItem[],
  B1: wordsB1 as WordItem[],
  B2: wordsB2 as WordItem[],
  C1: wordsC1 as WordItem[],
};

export const LEVEL_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export function getAllWords(): WordItem[] {
  return [
    ...wordsA1,
    ...wordsA2,
    ...wordsB1,
    ...wordsB2,
    ...wordsC1,
  ] as WordItem[];
}

export function getWordById(id: string): WordItem | undefined {
  return getAllWords().find((w) => w.id === id);
}

/**
 * Get words suitable for a user's selected level:
 * Primarily their current level, plus lower levels for reinforcement.
 */
export function getWordsForLevel(userLevel: CEFRLevel): WordItem[] {
  const levelIdx = LEVEL_ORDER.indexOf(userLevel);
  if (levelIdx === -1) return getAllWords();

  const primaryWords = ALL_WORDS_BY_LEVEL[userLevel] || [];
  
  // Include words from lower levels for reinforcement
  const lowerWords: WordItem[] = [];
  for (let i = 0; i < levelIdx; i++) {
    const lvl = LEVEL_ORDER[i];
    lowerWords.push(...(ALL_WORDS_BY_LEVEL[lvl] || []));
  }

  // Combine: primary first, then lower levels
  return [...primaryWords, ...lowerWords];
}

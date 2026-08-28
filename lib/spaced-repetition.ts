import { ReviewRating, UserProgress } from '@/types';

export interface SM2Result {
  easeFactor: number;
  intervalMinutes: number;
  nextReview: string; // ISO date string
  reviewCount: number;
}

/**
 * Calculates the next review date and spaced repetition parameters based on cumulative SM-2 multipliers.
 * Formula: new_interval = previous_interval * multiplier (where multiplier is derived from ease_factor / rating)
 */
export function calculateNextReview(
  progress: Partial<UserProgress> | undefined,
  rating: ReviewRating
): SM2Result {
  const currentEase = progress?.ease_factor ?? 2.5;
  const currentInterval = progress?.interval_minutes ?? 0;
  const currentReviewCount = progress?.review_count ?? 0;

  let newEase = currentEase;
  let intervalMinutes = 1;
  let newReviewCount = currentReviewCount;

  const now = new Date();

  switch (rating) {
    case 'again': {
      // Forgotten completely: reset interval to 1 minute, reduce ease factor
      intervalMinutes = 1;
      newEase = Math.max(1.3, currentEase - 0.2);
      newReviewCount = 0; // Reset streak count
      break;
    }

    case 'hard': {
      // Hard recall: penalize ease factor and apply cumulative multiplier (previous * 1.2)
      newEase = Math.max(1.3, currentEase - 0.15);
      newReviewCount = currentReviewCount + 1;
      if (currentInterval <= 1) {
        intervalMinutes = 10; // Seed interval: 10 minutes
      } else {
        intervalMinutes = Math.round(currentInterval * 1.2);
      }
      break;
    }

    case 'good': {
      // Good recall: cumulative multiplier (new_interval = previous_interval * ease_factor)
      newReviewCount = currentReviewCount + 1;
      if (currentInterval === 0 || currentInterval <= 1) {
        intervalMinutes = 60; // Seed interval: 1 hour (60 mins)
      } else if (currentInterval < 60) {
        intervalMinutes = 1440; // 1 day
      } else {
        intervalMinutes = Math.round(currentInterval * currentEase);
      }
      break;
    }

    case 'easy': {
      // Easy recall: boost ease factor and apply cumulative multiplier (previous * ease_factor * 1.3)
      newEase = Math.min(3.5, currentEase + 0.15);
      newReviewCount = currentReviewCount + 1;
      if (currentInterval === 0 || currentInterval <= 1) {
        intervalMinutes = 5760; // Seed interval: 4 days (5760 mins)
      } else if (currentInterval < 1440) {
        intervalMinutes = 10080; // 7 days (10080 mins)
      } else {
        intervalMinutes = Math.round(currentInterval * newEase * 1.3);
      }
      break;
    }
  }

  const nextReviewDate = new Date(now.getTime() + intervalMinutes * 60 * 1000);

  return {
    easeFactor: Number(newEase.toFixed(2)),
    intervalMinutes,
    nextReview: nextReviewDate.toISOString(),
    reviewCount: newReviewCount,
  };
}

/**
 * Human-readable interval badge for UI buttons (e.g., "1 د", "10 د", "1 ي", "7 ي")
 */
export function getIntervalDisplay(minutes: number, locale: 'ar' | 'en' = 'ar'): string {
  if (minutes < 60) {
    return locale === 'ar' ? `${minutes} د` : `${minutes}m`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return locale === 'ar' ? `${hours} س` : `${hours}h`;
  }
  const days = Math.round(minutes / 1440);
  if (days < 30) {
    return locale === 'ar' ? `${days} ي` : `${days}d`;
  }
  const months = Math.round(days / 30);
  return locale === 'ar' ? `${months} ش` : `${months}mo`;
}

/**
 * Predict intervals for all 4 rating buttons given current progress
 */
export function getNextIntervalPreviews(
  progress?: Partial<UserProgress>
): Record<ReviewRating, number> {
  return {
    again: calculateNextReview(progress, 'again').intervalMinutes,
    hard: calculateNextReview(progress, 'hard').intervalMinutes,
    good: calculateNextReview(progress, 'good').intervalMinutes,
    easy: calculateNextReview(progress, 'easy').intervalMinutes,
  };
}

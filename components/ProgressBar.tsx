'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { DAILY_FREE_LIMIT } from '@/lib/storage';

interface ProgressBarProps {
  currentIdx: number;
  totalCards: number;
  dailyReviewsUsed: number;
  subscriptionStatus?: 'free' | 'active';
}

export function ProgressBar({
  currentIdx,
  totalCards,
  dailyReviewsUsed,
  subscriptionStatus = 'free',
}: ProgressBarProps) {
  const { t, locale } = useLanguage();
  const isPro = subscriptionStatus === 'active';

  // Daily limit calculation (kept for internal logic / styling, not shown in full ratio)
  const isDailyLimitReached = !isPro && dailyReviewsUsed >= DAILY_FREE_LIMIT;

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Daily Limit Counter — always shows the actual count reviewed today,
          for both free and PRO users. PRO just gets a badge next to it,
          since there's no cap to warn about. */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>{t('nav.daily_limit')}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            <strong className={isDailyLimitReached ? 'text-rose-600 font-bold' : ''}>
              {dailyReviewsUsed}
            </strong>
          </span>
          {isPro && (
            <span className="text-brand-600 font-bold bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded-full text-[10px]">
              PRO ⚡
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
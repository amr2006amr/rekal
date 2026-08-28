'use client';

import React, { useEffect } from 'react';
import { ReviewRating, UserProgress } from '@/types';
import { getNextIntervalPreviews, getIntervalDisplay } from '@/lib/spaced-repetition';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface DifficultyButtonsProps {
  progress?: UserProgress;
  onRate: (rating: ReviewRating) => void;
  disabled?: boolean;
}

export function DifficultyButtons({ progress, onRate, disabled = false }: DifficultyButtonsProps) {
  const { locale, t } = useLanguage();
  const intervals = getNextIntervalPreviews(progress);

  // Keyboard shortcut listener: 1, 2, 3, 4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '1') {
        e.preventDefault();
        onRate('again');
      } else if (e.key === '2') {
        e.preventDefault();
        onRate('hard');
      } else if (e.key === '3') {
        e.preventDefault();
        onRate('good');
      } else if (e.key === '4') {
        e.preventDefault();
        onRate('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onRate]);

  const buttonConfigs: {
    key: ReviewRating;
    shortcut: string;
    label: string;
    desc: string;
    color: string;
    border: string;
    badgeBg: string;
  }[] = [
    {
      key: 'again',
      shortcut: '1',
      label: t('review.ratings.again'),
      desc: t('review.ratings.again_desc'),
      color: 'bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60',
      border: 'border-rose-200 dark:border-rose-800/80 hover:border-rose-400',
      badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
    },
    {
      key: 'hard',
      shortcut: '2',
      label: t('review.ratings.hard'),
      desc: t('review.ratings.hard_desc'),
      color: 'bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60',
      border: 'border-amber-200 dark:border-amber-800/80 hover:border-amber-400',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    },
    {
      key: 'good',
      shortcut: '3',
      label: t('review.ratings.good'),
      desc: t('review.ratings.good_desc'),
      color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60',
      border: 'border-emerald-200 dark:border-emerald-800/80 hover:border-emerald-400',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    },
    {
      key: 'easy',
      shortcut: '4',
      label: t('review.ratings.easy'),
      desc: t('review.ratings.easy_desc'),
      color: 'bg-blue-50 hover:bg-blue-100 text-blue-800 hover:text-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60',
      border: 'border-blue-200 dark:border-blue-800/80 hover:border-blue-400',
      badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buttonConfigs.map((cfg) => {
          const intervalText = getIntervalDisplay(intervals[cfg.key], locale);
          return (
            <button
              key={cfg.key}
              type="button"
              disabled={disabled}
              onClick={() => onRate(cfg.key)}
              className={`relative flex flex-col items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-150 transform active:scale-95 shadow-sm hover:shadow-md ${cfg.color} ${cfg.border} disabled:opacity-50 disabled:pointer-events-none group`}
            >
              {/* Interval badge & keyboard shortcut */}
              <div className="flex items-center justify-between w-full mb-1.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badgeBg}`}>
                  {intervalText}
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white/70 dark:bg-black/30 px-1.5 py-0.5 rounded">
                  {cfg.shortcut}
                </span>
              </div>

              {/* Rating Name */}
              <span className="text-base font-bold tracking-wide my-0.5">
                {cfg.label}
              </span>

              {/* Sub-description */}
              <span className="text-[11px] opacity-75 text-center line-clamp-1">
                {cfg.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

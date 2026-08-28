'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { WordCard } from '@/components/WordCard';
import { ProgressBar } from '@/components/ProgressBar';
import { ReviewRating, UserSettings, UserProgress } from '@/types';
import {
  getEffectiveSettings,
  getEffectiveProgressMap,
  buildReviewQueue,
  processReview,
  DAILY_FREE_LIMIT,
  ReviewQueueItem,
} from '@/lib/storage';
import { CheckCircle2, Sparkles, ArrowRight, ArrowLeft, Zap, RefreshCw, BarChart3 } from 'lucide-react';

export default function ReviewPage() {
  const { t, locale } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const loadSession = useCallback(async () => {
    const userSettings = await getEffectiveSettings(user?.id);
    const userProgress = await getEffectiveProgressMap(user?.id);
    setSettings(userSettings);
    setProgressMap(userProgress);
    const dueWords = buildReviewQueue(userSettings.level, userProgress);
    setQueue(dueWords);
    setCurrentIndex(0);
  }, [user?.id]);

  useEffect(() => {
    setMounted(true);
    loadSession();
  }, [loadSession]);

  if (!mounted || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDailyLimitReached =
    settings.subscription_status === 'free' &&
    settings.daily_reviews_used >= DAILY_FREE_LIMIT;

  const currentItem = queue[currentIndex];

  const handleRate = async (rating: ReviewRating) => {
    if (!currentItem || isUpdating) return;

    setIsUpdating(true);
    try {
      const { progress: updatedProg, settings: updatedSet } = await processReview(
        currentItem.word.id,
        rating,
        user?.id,
        currentItem.progress,
        settings
      );

      setSettings(updatedSet);
      setProgressMap((prev) => ({
        ...prev,
        [currentItem.word.id]: updatedProg,
      }));

      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        const refreshedMap = {
          ...progressMap,
          [currentItem.word.id]: updatedProg,
        };
        const nextDue = buildReviewQueue(updatedSet.level, refreshedMap);
        setQueue(nextDue);
        setCurrentIndex(0);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (isDailyLimitReached) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-xl">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <Zap size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('review.daily_limit_reached')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('review.daily_limit_desc')}
          </p>
        </div>

        <div className="bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/40 dark:to-emerald-950/20 border border-brand-200 dark:border-brand-900 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-brand-700 dark:text-brand-300">
            <Sparkles size={16} />
            <span className="text-sm font-bold">
              {locale === 'ar'
                ? 'اشترك بـ $5 فقط لتصل إلى مراجعات غير محدودة يومياً'
                : 'Subscribe for just $5 to unlock unlimited daily reviews'}
            </span>
          </div>
          <Link
            href="/settings"
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Zap size={16} />
            <span>{locale === 'ar' ? 'اشترك الآن' : 'Subscribe Now'}</span>
          </Link>
        </div>

        <div className="pt-2 space-y-3">
          <Link
            href="/dashboard"
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-brand-600 dark:hover:bg-brand-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <BarChart3 size={18} />
            <span>{t('review.back_to_dashboard')}</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!currentItem || queue.length === 0) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-xl animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 size={36} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('review.completed_title')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('review.completed_desc')}
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={loadSession}
            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            <RefreshCw size={16} />
            <span>{locale === 'ar' ? 'تحديث المراجعات' : 'Refresh Reviews'}</span>
          </button>
          <Link
            href="/dashboard"
            className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            <BarChart3 size={16} />
            <span>{t('review.back_to_dashboard')}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4 space-y-6">
      <ProgressBar
        currentIdx={currentIndex}
        totalCards={queue.length}
        dailyReviewsUsed={settings.daily_reviews_used || 0}
        subscriptionStatus={settings.subscription_status}
      />

      <WordCard
        key={currentItem.word.id}
        word={currentItem.word}
        progress={currentItem.progress}
        isNew={currentItem.isNew}
        onRate={handleRate}
      />
    </div>
  );
}
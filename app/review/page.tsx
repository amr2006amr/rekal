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
import { CheckCircle2, Sparkles, ArrowRight, ArrowLeft, Zap, RefreshCw, BarChart3, AlertTriangle } from 'lucide-react';

export default function ReviewPage() {
  const { t, locale } = useLanguage();
  const { user, settings, settingsLoading, setLocalSettings, updateSettings } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadQueue = useCallback(
    (currentSettings: UserSettings, userProgress: Record<string, UserProgress>) => {
      const dueWords = buildReviewQueue(currentSettings.level, userProgress);
      setQueue(dueWords);
      setCurrentIndex(0);
    },
    []
  );

  const loadSession = useCallback(async () => {
    if (!settings) return;
    setQueueLoading(true);
    const userProgress = await getEffectiveProgressMap(user?.id);
    setProgressMap(userProgress);
    loadQueue(settings, userProgress);
    setQueueLoading(false);
    // Deliberately depends on settings?.level (a primitive), not on the
    // whole `settings` object — see the comment on the effect below for
    // the full reasoning. `settings` itself is still read fresh from the
    // closure when this runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, settings?.level, loadQueue]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // IMPORTANT: this intentionally depends on `settings?.level`, NOT on
    // the `settings` object itself.
    //
    // Rating a word calls setLocalSettings() with a brand-new settings
    // object (daily_reviews_used incremented by one). If this effect
    // depended on `settings` directly, that new object reference alone
    // would re-trigger it after EVERY single rating — even though nothing
    // about which words belong in the queue actually changed. That was
    // silently causing, on every rating:
    //   1. A full extra network request straight from the browser to
    //      Supabase re-fetching the user's ENTIRE review history
    //      (visible in the Network tab as a `user_progress` request with
    //      no word_id filter), instead of just the one word we needed.
    //   2. The whole queue being rebuilt and currentIndex reset to 0,
    //      racing against handleRate's own "move to next card" update.
    // That combination is what was still causing noticeable lag/jank
    // even after optimizing the /api/review endpoint itself.
    //
    // We only want to reload the full session when the signed-in user
    // changes, or when their CEFR level changes (the level is what
    // actually determines which words belong in the queue) — never on
    // every daily-counter tick.
    if (!settingsLoading && settings) {
      loadSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoading, settings?.level, user?.id]);

  // While auth/settings are loading, OR the review queue itself hasn't
  // finished being built yet, show the spinner. Without the queueLoading
  // check, `queue` starts as an empty array and — for a brief moment
  // between settings finishing and loadSession() resolving — the
  // "completed / no reviews due" screen below would flash on screen even
  // though there ARE words waiting to be loaded.
  if (!mounted || settingsLoading || !settings || queueLoading) {
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

    setSubmitError(null);
    setIsUpdating(true);
    try {
      const { progress: updatedProg, settings: updatedSet } = await processReview(
        currentItem.word.id,
        rating,
        user?.id,
        currentItem.progress,
        settings
      );

      // processReview already persisted the new settings server-side (via
      // /api/review) when signed in, so we only sync local state here —
      // NOT another write to Supabase. Calling updateSettings() here would
      // fire a second, redundant network write and is what caused the
      // noticeable delay before advancing to the next card.
      setLocalSettings(updatedSet);
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
    } catch (err: any) {
      if (err?.message === 'daily_limit_reached') {
        // The server rejected this review because the account has actually
        // hit the free-tier cap — our local `settings` state was just stale
        // (e.g. reviewed from another tab/device in the meantime). Re-fetch
        // the real settings so the daily-limit screen below renders instead
        // of the review silently failing. This is just a local sync, not a
        // write, so setLocalSettings is correct here too.
        const freshSettings = await getEffectiveSettings(user?.id);
        setLocalSettings(freshSettings);
      } else {
        console.error('Failed to record review:', err);
        setSubmitError(
          locale === 'ar'
            ? 'تعذر حفظ المراجعة، حاول مرة أخرى'
            : 'Could not save your review, please try again'
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Skip the current word entirely: no reveal, no rating, not recorded as
  // reviewed, doesn't touch progress/settings/stats. Just move on.
  const handleSkip = () => {
    if (!currentItem) return;

    if (currentIndex + 1 < queue.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Was the last card in the queue — rebuild it the same way a normal
      // "session complete" refresh does.
      loadSession();
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

      {submitError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-2">
          <AlertTriangle size={14} />
          <span>{submitError}</span>
        </div>
      )}

      <WordCard
        key={currentItem.word.id}
        word={currentItem.word}
        progress={currentItem.progress}
        isNew={currentItem.isNew}
        onRate={handleRate}
        onSkip={handleSkip}
      />
    </div>
  );
}
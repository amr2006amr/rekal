'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAllWords } from '@/lib/data/words';
import { getEffectiveProgressMap, getEffectiveSettings, DAILY_FREE_LIMIT } from '@/lib/storage';
import { AudioButton } from '@/components/AudioButton';
import { getIntervalDisplay } from '@/lib/spaced-repetition';
import { UserSettings, UserProgress, WordItem } from '@/types';
import {
  Brain,
  CheckCircle2,
  Clock,
  Flame,
  Play,
  Settings,
  Layers,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
  LogIn,
} from 'lucide-react';

export default function DashboardPage() {
  const { t, locale } = useLanguage();
  const { user, settings, settingsLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
  const [words, setWords] = useState<WordItem[]>([]);
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;

  useEffect(() => {
  setMounted(true);
  const loadData = async () => {
    const prog = await getEffectiveProgressMap(user?.id);
    setProgressMap(prog);
    setWords(getAllWords());
  };
  loadData();
}, [user?.id]);

  if (!mounted || settingsLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate stats
  const reviewedCount = Object.keys(progressMap).length;

  // Only words the user has actually reviewed (has progress for)
  const reviewedWords = words.filter((w) => !!progressMap[w.id]);

  // Mastered: interval >= 1440 mins (1 day+) and review_count >= 2
  const masteredCount = Object.values(progressMap).filter(
    (p) => p.interval_minutes >= 1440 && p.review_count >= 2
  ).length;

  const learningCount = reviewedCount - masteredCount;

  return (
    <div className="space-y-8 py-4 sm:py-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {t('dashboard.title')}
            </h1>
            <span className="px-2.5 py-0.5 bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 rounded-full text-xs font-bold border border-brand-200 dark:border-brand-800">
              {settings.level}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {user ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck size={14} />
                <span>{user.email} (Supabase Sync ✓)</span>
              </span>
            ) : (
              <Link href="/login" className="flex items-center gap-1 text-brand-600 hover:underline">
                <LogIn size={13} />
                <span>{locale === 'ar' ? 'سجل دخولك لحفظ بياناتك في السحابة' : 'Sign in to sync with cloud'}</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/onboarding"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Settings size={14} />
            <span>{t('dashboard.change_level')}</span>
          </Link>

          <Link
            href="/review"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center gap-2"
          >
            <Play size={14} className="fill-current" />
            <span>{t('dashboard.quick_review_btn')}</span>
            <Arrow size={14} />
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Reviewed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3 text-brand-600 dark:text-brand-400">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('dashboard.total_words_reviewed')}
            </span>
            <Brain size={18} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {reviewedCount}
            </span>
          </div>
        </div>

        {/* Stat 2: Mastered */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3 text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('dashboard.mastered_words')}
            </span>
            <CheckCircle2 size={18} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {masteredCount}
            </span>
          </div>
        </div>

        {/* Stat 3: Learning */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3 text-amber-600 dark:text-amber-400">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('dashboard.learning_words')}
            </span>
            <Clock size={18} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {learningCount}
            </span>
          </div>
        </div>

        {/* Stat 4: Daily Limit */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3 text-rose-600 dark:text-rose-400">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('dashboard.daily_usage')}
            </span>
            <Flame size={18} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {settings.daily_reviews_used || 0}
            </span>
            <span className="text-xs text-slate-400">/ {DAILY_FREE_LIMIT}</span>
          </div>
        </div>
      </div>

      {/* Reviewed Words Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-brand-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('dashboard.word_list_title')}
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {reviewedWords.length} {t('dashboard.reviewed_count_label')}
          </span>
        </div>

        {reviewedWords.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.empty_reviewed')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 text-start font-bold">{t('dashboard.word_header')}</th>
                  <th className="py-3.5 px-4 text-start font-bold">{t('dashboard.level_header')}</th>
                  <th className="py-3.5 px-4 text-start font-bold">{t('dashboard.pos_header')}</th>
                  <th className="py-3.5 px-4 text-start font-bold">{locale === 'ar' ? 'المعنى' : 'Definition'}</th>
                  <th className="py-3.5 px-4 text-start font-bold">{t('dashboard.next_review_header')}</th>
                  <th className="py-3.5 px-4 text-start font-bold">{t('dashboard.status_header')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {reviewedWords.map((w) => {
                  const prog = progressMap[w.id];
                  const isDue = prog ? new Date(prog.next_review).getTime() <= Date.now() : false;

                  const statusBadge = isDue ? (
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded-md font-bold border border-rose-200 dark:border-rose-900">
                      {t('dashboard.status_due')}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-md font-bold border border-emerald-200 dark:border-emerald-900">
                      {t('dashboard.status_scheduled')}
                    </span>
                  );

                  return (
                    <tr key={w.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Word + Audio */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <AudioButton word={w.word} size="sm" />
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {w.word}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono dir-ltr">
                            {w.pronunciation}
                          </span>
                        </div>
                      </td>

                      {/* Level */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {w.level}
                      </td>

                      {/* Part of speech */}
                      <td className="py-3.5 px-4 italic text-slate-500">
                        {w.part_of_speech}
                      </td>

                      {/* Definition */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-700 dark:text-slate-300">
                        {locale === 'ar' ? w.definition_ar : w.definition_en}
                      </td>

                      {/* Next Review / Interval */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {getIntervalDisplay(prog!.interval_minutes, locale)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            (EF: {prog!.ease_factor})
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {statusBadge}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
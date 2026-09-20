'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAllWords } from '@/lib/data/words';
import {
  getEffectiveProgressMap,
  getEffectiveSettings,
  getEffectiveCustomWords,
  DAILY_FREE_LIMIT,
} from '@/lib/storage';
import { AudioButton } from '@/components/AudioButton';
import { WordDetailModal } from '@/components/WordDetailModal';
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
  PlusCircle,
  Search,
  X,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const { t, locale } = useLanguage();
  const { user, settings, settingsLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
  const [words, setWords] = useState<WordItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState<WordItem | null>(null);
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      const [prog, customWords] = await Promise.all([
        getEffectiveProgressMap(user?.id),
        getEffectiveCustomWords(user?.id),
      ]);
      setProgressMap(prog);
      const staticWords = getAllWords();
      const customIds = new Set(customWords.map((w) => w.id));
      const combined = [...customWords, ...staticWords.filter((w) => !customIds.has(w.id))];
      setWords(combined);
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

  // Only count words the user has actually reviewed at least once —
  // not words merely added to the queue via Add Words (those get a
  // user_progress row immediately at creation time with review_count=0).
  const reviewedCount = Object.values(progressMap).filter(
    (p) => (p.review_count ?? 0) > 0 && p.last_rating && p.last_reviewed
  ).length;

  // Sum of all individual review sessions across all words
  // (e.g. a word reviewed 4 times counts as 4 sessions here)
  const totalSessions = Object.values(progressMap).reduce(
    (sum, p) => sum + (p.review_count ?? 0),
    0
  );

  // Only words the user has actually reviewed (has progress for)
  const reviewedWords = words.filter((w) => !!progressMap[w.id]);

  // Filter words by search query across word text, Arabic/English definitions, part of speech, and level
  const filteredWords = reviewedWords.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const matchWord = w.word.toLowerCase().includes(q);
    const matchDefAr = w.definition_ar?.toLowerCase().includes(q);
    const matchDefEn = w.definition_en?.toLowerCase().includes(q);
    const matchPos = w.part_of_speech?.toLowerCase().includes(q);
    const matchLevel = w.level?.toLowerCase().includes(q);
    return matchWord || matchDefAr || matchDefEn || matchPos || matchLevel;
  });

  // Mastered: interval >= 1440 mins (1 day+) and review_count >= 2
  const masteredCount = Object.values(progressMap).filter(
    (p) => p.interval_minutes >= 1440 && p.review_count >= 2
  ).length;

  const learningCount = reviewedCount - masteredCount;

  const isPro = settings.subscription_status === 'active';

  // Streak is only ever populated for signed-in users (calculated
  // server-side by record_review()) — guests simply won't have it.
  const streak = settings.current_streak ?? 0;

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
                <span>{user.email}</span>
              </span>
            ) : (
              <Link href="/login" className="flex items-center gap-1 text-brand-600 hover:underline">
                <LogIn size={13} />
                <span>{locale === 'ar' ? 'سجل دخولك لحفظ بياناتك في السحابة' : 'Sign in to sync with cloud'}</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Link
            href="/add-word"
            className="px-3.5 sm:px-4 py-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <PlusCircle size={14} />
            <span>{locale === 'ar' ? 'إضافة كلمة' : 'Add Word'}</span>
          </Link>

          <Link
            href="/onboarding"
            className="px-3.5 sm:px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Settings size={14} />
            <span>{t('dashboard.change_level')}</span>
          </Link>

          <Link
            href="/review"
            className="px-4 sm:px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center gap-2"
          >
            <Play size={14} className="fill-current" />
            <span>{t('dashboard.quick_review_btn')}</span>
            <Arrow size={14} />
          </Link>
        </div>
      </div>

      {/* Streak Banner */}
      {user && (
        <div className="relative overflow-hidden bg-gradient-to-l from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 shadow-lg shadow-orange-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Flame size={30} className="text-white fill-white/30" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black text-white">{streak}</span>
                <span className="text-sm font-bold text-white/90">
                  {locale === 'ar'
                    ? (streak >= 2 && streak <= 10
                        ? t('dashboard.streak_label_plural')
                        : t('dashboard.streak_label_single'))
                    : (streak === 1
                        ? t('dashboard.streak_label_single')
                        : t('dashboard.streak_label_plural'))}
                </span>
              </div>
              <p className="text-xs text-white/80 font-medium">
                {streak > 0 ? t('dashboard.streak_title') : t('dashboard.streak_start')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Reviewed Words (split into 2 sub-stats) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between text-brand-600 dark:text-brand-400">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('dashboard.total_words_reviewed')}
            </span>
            <Brain size={18} />
          </div>

          {/* Sub-stat: Unique words reviewed */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {reviewedCount}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                {t('dashboard.unique_words_reviewed')}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Sub-stat: Total review sessions */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {t('dashboard.total_review_sessions')}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-brand-600 dark:text-brand-400">
                {totalSessions}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                {t('dashboard.total_sessions_label')}
              </span>
            </div>
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
            <span className="text-xs text-slate-400">/ {isPro ? '∞' : DAILY_FREE_LIMIT}</span>
          </div>
        </div>
      </div>

      {/* Reviewed Words Table & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {/* Table Header: Title + Search Input */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-brand-500 shrink-0" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('dashboard.word_list_title')}
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              ({reviewedWords.length})
            </span>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('dashboard.search_placeholder')}
              className="w-full ps-9 pe-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t('dashboard.clear_search')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Subheader Hint & Search Results Counter */}
        {reviewedWords.length > 0 && (
          <div className="px-5 py-2.5 bg-slate-50/70 dark:bg-slate-850/40 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <span>💡</span>
              <span>{t('dashboard.click_card_hint')}</span>
            </span>
            {searchQuery.trim() && (
              <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">
                {filteredWords.length} {t('dashboard.search_results_count')}
              </span>
            )}
          </div>
        )}

        {reviewedWords.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.empty_reviewed')}
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="p-10 text-center space-y-2.5">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {t('dashboard.no_search_results')}
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              {t('dashboard.clear_search')}
            </button>
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
                {filteredWords.map((w) => {
                  const prog = progressMap[w.id];
                  const isDue = prog ? new Date(prog.next_review).getTime() <= Date.now() : false;
                  const isCustom = Boolean((w as any).user_id);

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
                    <tr
                      key={w.id}
                      onClick={() => setSelectedWord(w)}
                      className="cursor-pointer hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-all group"
                      title={t('dashboard.click_card_hint')}
                    >
                      {/* Word + Audio */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div onClick={(e) => e.stopPropagation()}>
                            <AudioButton word={w.word} size="sm" />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {w.word}
                          </span>
                          {isCustom && (
                            <span className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded text-[10px] font-bold">
                              {locale === 'ar' ? 'كلمتي' : 'My Word'}
                            </span>
                          )}
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
                        {locale === 'ar' ? (w.definition_ar || w.definition_en) : (w.definition_en || w.definition_ar)}
                      </td>

                      {/* Next Review / Interval */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {prog ? getIntervalDisplay(prog.interval_minutes, locale) : '-'}
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

      {/* Full Word Details Modal */}
      <WordDetailModal
        word={selectedWord}
        progress={selectedWord ? progressMap[selectedWord.id] : null}
        isOpen={!!selectedWord}
        onClose={() => setSelectedWord(null)}
      />
    </div>
  );
}
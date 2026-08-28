'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WordItem, UserProgress, ReviewRating } from '@/types';
import { AudioButton } from './AudioButton';
import { DifficultyButtons } from './DifficultyButtons';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { Eye, BookOpen, Quote, Sparkles, History, Lock, LogIn } from 'lucide-react';

interface WordCardProps {
  word: WordItem;
  progress?: UserProgress;
  isNew?: boolean;
  onRate: (rating: ReviewRating) => void;
}

const RATING_BADGE_COLORS: Record<string, string> = {
  again: 'text-rose-700 bg-rose-100 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800/80',
  hard: 'text-amber-800 bg-amber-100 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800/80',
  good: 'text-emerald-800 bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/80',
  easy: 'text-blue-800 bg-blue-100 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800/80',
};

export function WordCard({ word, progress, isNew = false, onRate }: WordCardProps) {
  const { locale, t } = useLanguage();
  const { user } = useAuth();
  const [isRevealed, setIsRevealed] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Reset revealed / prompt state when word changes
  useEffect(() => {
    setIsRevealed(false);
    setShowLoginPrompt(false);
  }, [word.id]);

  const handleRevealClick = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setIsRevealed(true);
  };

  // Spacebar toggle handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!user) {
          setShowLoginPrompt(true);
          return;
        }
        setIsRevealed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  const ratingBadgeClass = progress?.last_rating
    ? RATING_BADGE_COLORS[progress.last_rating]
    : 'text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700';

  return (
    <div className="w-full max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-full text-xs font-black tracking-wider border border-slate-200/60 dark:border-slate-700">
            {word.level}
          </span>
          <span className="px-2.5 py-0.5 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 rounded-md text-xs font-semibold italic">
            {word.part_of_speech}
          </span>
        </div>

        {isNew ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 px-2.5 py-0.5 rounded-full">
            <Sparkles size={12} />
            {t('review.new_badge')}
          </span>
        ) : (
          <span className={`flex items-center gap-1 text-[11px] font-bold border px-2.5 py-0.5 rounded-full ${ratingBadgeClass}`}>
            <History size={12} />
            {progress?.last_rating
              ? t(`review.ratings.${progress.last_rating}`)
              : (locale === 'ar' ? 'راجعتها من قبل' : 'Previously reviewed')}
          </span>
        )}
      </div>

      {/* Main Word Presentation Area */}
      <div className="flex flex-col items-center text-center my-6 space-y-3">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            {word.word}
          </h1>
          <AudioButton word={word.word} size="lg" />
        </div>
        <p className="text-sm font-mono text-slate-400 dark:text-slate-500 tracking-wide dir-ltr">
          {word.pronunciation}
        </p>
      </div>

      {/* Hidden / Revealed / Login-Required Content Area */}
      {showLoginPrompt ? (
        <div className="my-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 bg-brand-50 dark:bg-brand-950/50 text-brand-600 rounded-2xl flex items-center justify-center">
            <Lock size={26} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {locale === 'ar' ? 'سجّل دخولك للمتابعة' : 'Sign in to continue'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
              {locale === 'ar'
                ? 'تحتاج لتسجيل الدخول أولاً حتى تقدر تراجع الكلمات ويتم حفظ تقدمك.'
                : 'Sign in first to reveal meanings and save your review progress.'}
            </p>
          </div>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            <span>{locale === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowLoginPrompt(false)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {locale === 'ar' ? 'رجوع' : 'Back'}
          </button>
        </div>
      ) : !isRevealed ? (
        <div className="my-8 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={handleRevealClick}
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-brand-600 dark:hover:bg-brand-500 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2 group"
          >
            <Eye size={18} className="group-hover:scale-110 transition-transform" />
            <span>{t('review.show_answer')}</span>
          </button>
          <span className="text-[11px] text-slate-400 mt-2 font-mono">
            {t('review.press_space')}
          </span>
        </div>
      ) : (
        <div className="my-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-2">
              <BookOpen size={14} className="text-brand-500" />
              <span>{locale === 'ar' ? 'المعنى والتعريف' : 'Definition'}</span>
            </div>
            <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
              {locale === 'ar' ? word.definition_ar : word.definition_en}
            </p>
          </div>

          {word.examples && word.examples.length > 0 && (
            <div className="bg-brand-50/50 dark:bg-brand-950/20 p-4 sm:p-5 rounded-2xl border border-brand-100 dark:border-brand-900/40 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 mb-1">
                <Quote size={14} />
                <span>{locale === 'ar' ? 'أمثلة في سياق الاستخدام (3 أمثلة)' : 'Examples in Context (3 Examples)'}</span>
              </div>
              <div className="space-y-3 divide-y divide-brand-100/70 dark:divide-brand-900/30">
                {word.examples.map((ex, idx) => (
                  <div key={idx} className={idx > 0 ? 'pt-3' : ''}>
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 italic dir-ltr text-left">
                        <span className="inline-block w-5 text-xs font-mono font-bold text-brand-500 not-italic">
                          {idx + 1}.
                        </span>
                        &ldquo;{ex.sentence}&rdquo;
                      </p>
                      <AudioButton word={ex.sentence} size="sm" />
                    </div>
                    {locale === 'ar' && ex.translation_ar && (
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 pl-5 rtl:pl-0 rtl:pr-5">
                        {ex.translation_ar}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-center text-slate-500 dark:text-slate-400 mb-3">
              {t('review.rate_prompt')}
            </p>
            <DifficultyButtons progress={progress} onRate={onRate} />
          </div>
        </div>
      )}
    </div>
  );
}
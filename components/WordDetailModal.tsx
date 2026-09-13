'use client';

import React, { useEffect } from 'react';
import { WordItem, UserProgress } from '@/types';
import { AudioButton } from './AudioButton';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getIntervalDisplay } from '@/lib/spaced-repetition';
import {
  X,
  BookOpen,
  Quote,
  Clock,
  Sparkles,
  BarChart2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface WordDetailModalProps {
  word: WordItem | null;
  progress?: UserProgress | null;
  isOpen: boolean;
  onClose: () => void;
}

const RATING_INFO: Record<
  string,
  { labelAr: string; labelEn: string; color: string; descAr: string; descEn: string }
> = {
  again: {
    labelAr: 'مجدداً',
    labelEn: 'Again',
    color: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    descAr: 'نسيت تماماً',
    descEn: 'Completely forgot',
  },
  hard: {
    labelAr: 'صعب',
    labelEn: 'Hard',
    color: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    descAr: 'تذكرت بصعوبة',
    descEn: 'Recalled with difficulty',
  },
  good: {
    labelAr: 'جيد',
    labelEn: 'Good',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    descAr: 'تذكرت طبيعي',
    descEn: 'Recalled correctly',
  },
  easy: {
    labelAr: 'سهل',
    labelEn: 'Easy',
    color: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    descAr: 'سهل وبديهي',
    descEn: 'Very easy recall',
  },
};

export function WordDetailModal({ word, progress, isOpen, onClose }: WordDetailModalProps) {
  const { locale, t } = useLanguage();

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !word) return null;

  const isCustomWord = Boolean((word as any).user_id);
  const isDue = progress ? new Date(progress.next_review).getTime() <= Date.now() : false;

  // Format next review date
  const formatNextReview = (isoDate?: string) => {
    if (!isoDate) return locale === 'ar' ? 'غير محدد' : 'Not scheduled';
    const date = new Date(isoDate);
    return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Determine difficulty tier based on ease factor
  const easeFactor = progress?.ease_factor ?? 2.5;
  let difficultyTier = {
    labelAr: 'صعوبة معتدلة',
    labelEn: 'Moderate Difficulty',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
  };
  if (easeFactor >= 2.6) {
    difficultyTier = {
      labelAr: 'سهلة ومتقنة',
      labelEn: 'Easy / Well Retained',
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    };
  } else if (easeFactor < 2.3) {
    difficultyTier = {
      labelAr: 'تحتاج تركيز وتكرار',
      labelEn: 'Needs Focus / Challenging',
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    };
  }

  const lastRatingInfo = progress?.last_rating ? RATING_INFO[progress.last_rating] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto transition-all transform animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
          className="absolute top-5 right-5 rtl:right-auto rtl:left-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
        >
          <X size={18} />
        </button>

        {/* Top Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-5 pr-10 rtl:pr-0 rtl:pl-10">
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-full text-xs font-black tracking-wider border border-slate-200/60 dark:border-slate-700">
            {word.level}
          </span>
          <span className="px-2.5 py-0.5 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 rounded-md text-xs font-semibold italic">
            {word.part_of_speech}
          </span>

          {isCustomWord && (
            <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 rounded-full text-xs font-bold flex items-center gap-1">
              <Sparkles size={11} />
              <span>{locale === 'ar' ? 'كلمتي' : 'My Word'}</span>
            </span>
          )}

          {progress && (
            <span
              className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                isDue
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
              }`}
            >
              {isDue
                ? (locale === 'ar' ? 'مستحقة للمراجعة الآن' : 'Due Now')
                : (locale === 'ar' ? 'مجدولة' : 'Scheduled')}
            </span>
          )}
        </div>

        {/* Word and Audio */}
        <div className="flex flex-col items-center text-center my-4 space-y-2.5">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {word.word}
            </h2>
            <AudioButton word={word.word} size="lg" />
          </div>
          {word.pronunciation && (
            <p className="text-sm font-mono text-slate-400 dark:text-slate-500 tracking-wide dir-ltr">
              {word.pronunciation}
            </p>
          )}
        </div>

        {/* Definition Section */}
        <div className="my-5 bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <BookOpen size={14} className="text-brand-500" />
            <span>{locale === 'ar' ? 'المعنى والتعريف' : 'Definition'}</span>
          </div>
          <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
            {locale === 'ar'
              ? (word.definition_ar || word.definition_en)
              : (word.definition_en || word.definition_ar)}
          </p>
          {locale === 'ar' && word.definition_en && word.definition_ar && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic dir-ltr text-left pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              {word.definition_en}
            </p>
          )}
        </div>

        {/* Examples Section */}
        {word.examples && word.examples.length > 0 && (
          <div className="my-5 bg-brand-50/50 dark:bg-brand-950/20 p-4 sm:p-5 rounded-2xl border border-brand-100 dark:border-brand-900/40 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 mb-1">
              <Quote size={14} />
              <span>
                {locale === 'ar'
                  ? `أمثلة في سياق الاستخدام (${word.examples.length} أمثلة)`
                  : `Examples in Context (${word.examples.length} Examples)`}
              </span>
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

        {/* Difficulty & Spaced Repetition Progress Card */}
        {progress ? (
          <div className="my-5 bg-slate-50 dark:bg-slate-850/70 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <BarChart2 size={15} className="text-brand-500" />
                <span>{locale === 'ar' ? 'مستوى الصعوبة وحالة التكرار المتباعد' : 'Difficulty & Learning Progress'}</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${difficultyTier.color}`}>
                {locale === 'ar' ? difficultyTier.labelAr : difficultyTier.labelEn}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              {/* Ease Factor */}
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">
                  {locale === 'ar' ? 'معامل السهولة (EF)' : 'Ease Factor'}
                </span>
                <span className="font-mono font-black text-slate-800 dark:text-slate-100 text-sm">
                  {easeFactor.toFixed(2)}
                </span>
              </div>

              {/* Interval */}
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">
                  {locale === 'ar' ? 'الفاصل الزمني' : 'Interval'}
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {getIntervalDisplay(progress.interval_minutes, locale)}
                </span>
              </div>

              {/* Review Count */}
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">
                  {locale === 'ar' ? 'مرات المراجعة' : 'Reviews Count'}
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {progress.review_count} {locale === 'ar' ? 'مرات' : 'times'}
                </span>
              </div>

              {/* Last Rating */}
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">
                  {locale === 'ar' ? 'آخر تقييم' : 'Last Rating'}
                </span>
                {lastRatingInfo ? (
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold border ${lastRatingInfo.color}`}>
                    {locale === 'ar' ? lastRatingInfo.labelAr : lastRatingInfo.labelEn}
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">-</span>
                )}
              </div>
            </div>

            {/* Next Review Schedule Date */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <Calendar size={13} className="text-brand-500 shrink-0" />
              <span>
                {locale === 'ar' ? 'المراجعة القادمة:' : 'Next Review:'}{' '}
                <strong className="text-slate-700 dark:text-slate-200 font-mono">
                  {formatNextReview(progress.next_review)}
                </strong>
              </span>
            </div>
          </div>
        ) : null}

        {/* Modal Footer Button */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-brand-600 dark:hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
          >
            {locale === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

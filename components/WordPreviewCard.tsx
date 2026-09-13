'use client';

import React from 'react';
import { WordItem } from '@/types';
import { AudioButton } from './AudioButton';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { BookOpen, Quote, Sparkles, Check, X, Loader2 } from 'lucide-react';

interface WordPreviewCardProps {
  word: WordItem;
  isLoading?: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
  confirmLabel?: string;
}

export function WordPreviewCard({
  word,
  isLoading = false,
  onConfirm,
  onDiscard,
  confirmLabel,
}: WordPreviewCardProps) {
  const { locale } = useLanguage();

  return (
    <div className="w-full max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300 animate-in fade-in zoom-in-95">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-full text-xs font-black tracking-wider border border-slate-200/60 dark:border-slate-700">
            {word.level}
          </span>
          <span className="px-2.5 py-0.5 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 rounded-md text-xs font-semibold italic">
            {word.part_of_speech}
          </span>
          <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 rounded-full text-xs font-bold flex items-center gap-1">
            <Sparkles size={11} />
            <span>{locale === 'ar' ? 'معاينة الكلمة' : 'Word Preview'}</span>
          </span>
        </div>

        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          {locale === 'ar' ? 'جاهزة للإضافة' : 'Ready to add'}
        </span>
      </div>

      {/* Main Word Presentation Area */}
      <div className="flex flex-col items-center text-center my-6 space-y-3">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
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

      {/* Content Area */}
      <div className="my-6 space-y-5">
        {/* Definition */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <BookOpen size={14} className="text-brand-500" />
            <span>{locale === 'ar' ? 'المعنى والتعريف' : 'Definition'}</span>
          </div>
          <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
            {locale === 'ar'
              ? (word.definition_ar || word.definition_en)
              : (word.definition_en || word.definition_ar)}
          </p>
          {(locale === 'ar' ? word.definition_en : word.definition_ar) && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic dir-ltr text-left">
              {locale === 'ar' ? word.definition_en : word.definition_ar}
            </p>
          )}
        </div>

        {/* Examples */}
        {word.examples && word.examples.length > 0 && (
          <div className="bg-brand-50/50 dark:bg-brand-950/20 p-4 sm:p-5 rounded-2xl border border-brand-100 dark:border-brand-900/40 space-y-3">
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
                  {ex.translation_ar && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 pl-5 rtl:pl-0 rtl:pr-5">
                      {ex.translation_ar}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3.5 px-6 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-400 text-white font-bold rounded-2xl shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 transform active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{locale === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Check size={18} />
                <span>{confirmLabel || (locale === 'ar' ? 'أضف لمراجعاتي' : 'Add to My Reviews')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onDiscard}
            disabled={isLoading}
            className="py-3.5 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <X size={18} />
            <span>{locale === 'ar' ? 'تجاهل' : 'Discard'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

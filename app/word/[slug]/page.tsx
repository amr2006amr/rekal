import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Quote, Lock, ArrowLeft } from 'lucide-react';
import { getAllWords, getWordById } from '@/lib/data/words';
import { AudioButton } from '@/components/AudioButton';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rekal.online';

interface PageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  const words = getAllWords();
  return words.map((word) => ({
    slug: word.id,
  }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const word = getWordById(params.slug);

  if (!word) {
    return {
      title: 'الكلمة غير موجودة | رِكال',
      robots: { index: false, follow: false },
    };
  }

  const title = `معنى كلمة ${word.word} بالعربي والإنجليزي | رِكال`;
  const cleanDesc = word.definition_ar.replace(/\s+/g, ' ').trim();
  const description =
    cleanDesc.length > 150 ? `${cleanDesc.slice(0, 147)}...` : cleanDesc;
  const canonicalUrl = `${BASE_URL}/word/${word.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Rekal',
      locale: 'ar',
      type: 'article',
    },
  };
}

export default function WordPage({ params }: PageProps) {
  const word = getWordById(params.slug);

  if (!word) {
    notFound();
  }

  // Strictly display only the first example, never leaking remaining examples in HTML
  const firstExample = word.examples && word.examples.length > 0 ? word.examples[0] : null;

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 py-4 sm:py-8">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6 transition-all duration-300">
        {/* Top Badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-full text-xs font-black tracking-wider border border-slate-200/60 dark:border-slate-700">
              {word.level}
            </span>
            <span className="px-2.5 py-0.5 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 rounded-md text-xs font-semibold italic">
              {word.part_of_speech}
            </span>
          </div>
        </div>

        {/* Word and Pronunciation */}
        <div className="flex flex-col items-center text-center my-4 space-y-3">
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

        {/* Definitions */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1.5">
              <BookOpen size={14} className="text-brand-500" />
              <span>المعنى والتعريف</span>
            </div>
            <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
              {word.definition_ar}
            </p>
          </div>

          {word.definition_en && (
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-sm text-slate-600 dark:text-slate-300 leading-relaxed dir-ltr text-left">
              <span className="text-xs font-bold text-slate-400 block mb-1">English Definition:</span>
              {word.definition_en}
            </div>
          )}
        </div>

        {/* First Example Only */}
        {firstExample && (
          <div className="bg-brand-50/50 dark:bg-brand-950/20 p-4 sm:p-5 rounded-2xl border border-brand-100 dark:border-brand-900/40 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 mb-1">
              <Quote size={14} />
              <span>مثال في سياق الاستخدام</span>
            </div>
            <div>
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 italic dir-ltr text-left">
                  &ldquo;{firstExample.sentence}&rdquo;
                </p>
                <AudioButton word={firstExample.sentence} size="sm" />
              </div>
              {firstExample.translation_ar && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
                  {firstExample.translation_ar}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Locked More Examples & SRS Promotion Banner */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-amber-500/10 via-brand-500/10 to-transparent border-2 border-dashed border-brand-500/30 dark:border-brand-500/20 rounded-2xl sm:rounded-3xl space-y-4 text-center">
          <div className="w-12 h-12 mx-auto bg-brand-100 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center">
            <Lock size={22} />
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 leading-relaxed max-w-md mx-auto">
            🔒 سجّل مجانًا لعرض بقية الأمثلة على هذي الكلمة، ونظام المراجعة الذكي بالتكرار المتباعد لآلاف الكلمات زيها.
          </p>
          <div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-brand-500/25 transition-all duration-200 transform active:scale-95 text-sm sm:text-base"
            >
              <span>سجّل مجانًا الآن</span>
              <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Globe } from 'lucide-react';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, toggleLocale } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
        locale === 'ar'
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-brand-500'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-brand-500'
      } ${className}`}
      title={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <Globe size={14} className="text-brand-600 dark:text-brand-400" />
      <span>{locale === 'ar' ? 'English' : 'العربية'}</span>
    </button>
  );
}

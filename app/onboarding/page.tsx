'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { CEFRLevel } from '@/types';
import { getEffectiveSettings, saveEffectiveSettings } from '@/lib/storage';
import { Check, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';

const LEVEL_DETAILS: {
  level: CEFRLevel;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  badge: string;
}[] = [
  {
    level: 'A1',
    titleAr: 'مبتدئ (Beginner)',
    titleEn: 'Beginner (A1)',
    descAr: 'الكلمات الأساسية جداً والتعبيرات اليومية البسيطة',
    descEn: 'Basic vocabulary and everyday expressions',
    badge: 'A1',
  },
  {
    level: 'A2',
    titleAr: 'أساسي (Elementary)',
    titleEn: 'Elementary (A2)',
    descAr: 'المحادثات الروتينية والأنشطة المعتادة والمعلومات الشخصية',
    descEn: 'Routine tasks and familiar day-to-day topics',
    badge: 'A2',
  },
  {
    level: 'B1',
    titleAr: 'متوسط (Intermediate)',
    titleEn: 'Intermediate (B1)',
    descAr: 'التعامل مع معظم مواقف السفر والعمل والأحداث المألوفة',
    descEn: 'Travel, work topics, and expressing opinions clearly',
    badge: 'B1',
  },
  {
    level: 'B2',
    titleAr: 'فوق المتوسط (Upper Intermediate)',
    titleEn: 'Upper Intermediate (B2)',
    descAr: 'مفردات أكاديمية واجتماعية متقدمة وفهم الأفكار المعقدة',
    descEn: 'Complex topics, academic discourse, and fluent communication',
    badge: 'B2',
  },
  {
    level: 'C1',
    titleAr: 'متقدم (Advanced)',
    titleEn: 'Advanced (C1)',
    descAr: 'مفردات متخصصة، استعارات، ونصوص احترافية عميقة',
    descEn: 'Specialized nuances, idioms, and high-level professional vocabulary',
    badge: 'C1',
  },
];

export default function OnboardingPage() {
  const { t, locale } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('B2');
  const [saving, setSaving] = useState(false);
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (!authLoading) {
      getEffectiveSettings(user?.id).then((s) => {
        setSelectedLevel(s.level || 'B2');
      });
    }
  }, [authLoading, user?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const current = await getEffectiveSettings(user?.id);
      await saveEffectiveSettings(
        {
          ...current,
          level: selectedLevel,
        },
        user?.id
      );
      router.push('/review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 rounded-full text-xs font-bold border border-brand-200 dark:border-brand-800">
          <Sparkles size={14} />
          <span>{locale === 'ar' ? 'تخصيص الخطة' : 'Level Customization'}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          {t('onboarding.title')}
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          {t('onboarding.subtitle')}
        </p>
      </div>

      {/* Level Selection Cards */}
      <div className="space-y-3">
        {LEVEL_DETAILS.map((item) => {
          const isSelected = selectedLevel === item.level;
          return (
            <div
              key={item.level}
              onClick={() => setSelectedLevel(item.level)}
              className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'bg-brand-50/70 dark:bg-brand-950/40 border-brand-500 shadow-md shadow-brand-500/10'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Level Badge */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base transition-colors ${
                    isSelected
                      ? 'bg-brand-500 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {item.badge}
                </div>

                {/* Level Text */}
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {locale === 'ar' ? item.titleAr : item.titleEn}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {locale === 'ar' ? item.descAr : item.descEn}
                  </p>
                </div>
              </div>

              {/* Radio Indicator */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-brand-500 text-white'
                    : 'border-2 border-slate-300 dark:border-slate-700'
                }`}
              >
                {isSelected && <Check size={14} className="stroke-[3]" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Button */}
      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white font-black text-base rounded-2xl shadow-xl shadow-brand-500/25 transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <span>{t('onboarding.confirm')}</span>
            <Arrow size={18} />
          </>
        )}
      </button>
    </div>
  );
}

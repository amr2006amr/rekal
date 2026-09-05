'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { ArrowLeft, ArrowRight, Play, Sparkles, Brain, Languages, ShieldCheck, CheckCircle2, Zap } from 'lucide-react';
import { getEffectiveSettings } from '@/lib/storage';
import { CEFRLevel } from '@/types';

export default function HomeClient() {
  const { t, locale } = useLanguage();
  const { settings } = useAuth();
  const level = settings?.level || 'B2';
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-12 space-y-12">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-xs font-bold border border-brand-200 dark:border-brand-800 animate-pulse">
          <Sparkles size={14} />
          <span>{locale === 'ar' ? 'نظام التكرار المتباعد الذكي' : 'Smart Spaced Repetition'}</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
          {t('home.hero_title')}
        </h1>

        <p className="text-base sm:text-xl text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
          {t('home.hero_desc')}
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/review"
            className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black text-base rounded-2xl shadow-xl shadow-brand-500/25 transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2.5 group"
          >
            <Play size={18} className="fill-current" />
            <span>{t('home.start_now')}</span>
            <Arrow size={18} className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/onboarding"
            className="w-full sm:w-auto px-6 py-4 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-base rounded-2xl border border-slate-200 dark:border-slate-800 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>{t('home.select_level')}</span>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 rounded-md text-xs font-mono font-bold">
              {level}
            </span>
          </Link>
        </div>
      </div>

      {/* 3 Core Value Props Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl pt-6">
        {/* Feature 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:border-brand-500/50 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {t('home.feature_1_title')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('home.feature_1_desc')}
          </p>
        </div>

        {/* Feature 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:border-brand-500/50 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
            <Brain size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {t('home.feature_2_title')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('home.feature_2_desc')}
          </p>
        </div>

        {/* Feature 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:border-brand-500/50 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <Languages size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {t('home.feature_3_title')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('home.feature_3_desc')}
          </p>
        </div>
      </div>

      {/* Upgrade to Unlimited Banner */}
      <div className="w-full max-w-4xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sm:p-8 rounded-3xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1 text-center sm:text-start">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-brand-400">
            <Sparkles size={16} />
            <span>{locale === 'ar' ? 'الباقة المميزة' : 'Premium Plan'}</span>
          </div>
          <h4 className="text-xl font-bold">
            {locale === 'ar'
              ? 'اشترك واحصل على عدد غير محدود من الكلمات يومياً'
              : 'Subscribe for unlimited daily reviews'}
          </h4>
          <p className="text-xs text-slate-300">
            {locale === 'ar'
              ? 'تجاوز حد الـ30 مراجعة يومية وراجع بلا قيود مقابل $5 فقط شهرياً.'
              : 'Break past the 30-review daily limit — unlimited reviews for just $5/month.'}
          </p>
        </div>

        <Link
          href="/settings"
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5"
        >
          <Zap size={14} />
          <span>{locale === 'ar' ? 'اشترك الآن' : 'Subscribe Now'}</span>
        </Link>
      </div>
    </div>
  );
}
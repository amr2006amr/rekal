'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { CEFRLevel, UserSettings } from '@/types';
import { getEffectiveSettings, saveEffectiveSettings, clearUserData } from '@/lib/storage';
import { LEVEL_ORDER } from '@/lib/data/words';
import { Check, RotateCcw, Shield, User as UserIcon, LogOut, LogIn, Sparkles, CheckCircle2, AlertTriangle, Zap, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { t, locale } = useLanguage();
  const { user, signOut, settings, settingsLoading, updateSettings, refreshSettings } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || settingsLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLevelChange = async (newLevel: CEFRLevel) => {
    const updated: UserSettings = {
      ...settings,
      level: newLevel,
    };
    await updateSettings(updated);
  };

  const handleResetData = async () => {
    if (window.confirm(t('settings.reset_confirm'))) {
      await clearUserData(user?.id);
      await refreshSettings();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleUpgrade = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setUpgradeError(null);
    setUpgrading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'checkout_failed');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setUpgradeError(
        locale === 'ar' ? 'تعذر بدء عملية الدفع، حاول مرة أخرى' : 'Could not start checkout, please try again'
      );
      setUpgrading(false);
    }
  };

  const isPro = settings.subscription_status === 'active';

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">
          {t('settings.title')}
        </h1>
      </div>

      {/* Account Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserIcon size={18} className="text-brand-500" />
              <span>{t('settings.account_title')}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {user ? (
                <span>
                  {t('settings.logged_in_as')}: <strong className="text-slate-800 dark:text-slate-200">{user.email}</strong>
                </span>
              ) : (
                t('settings.guest_mode')
              )}
            </p>
          </div>

          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-rose-200 dark:border-rose-900"
            >
              <LogOut size={13} />
              <span>{t('nav.logout')}</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <LogIn size={14} />
              <span>{t('nav.login')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Level Selection Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {t('settings.level_title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings.level_desc')}
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {LEVEL_ORDER.map((lvl) => {
            const isSelected = settings.level === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => handleLevelChange(lvl)}
                className={`py-3 rounded-2xl font-black text-sm border-2 transition-all duration-150 ${
                  isSelected
                    ? 'bg-brand-500 text-white border-brand-600 shadow-md shadow-brand-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                {lvl}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subscription Plan Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield size={18} className="text-brand-500" />
            <span>{t('settings.plan_title')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* FREE plan card */}
          <div
            className={`relative rounded-2xl border-2 p-4 space-y-3 transition-all ${
              !isPro
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-900 dark:text-white">FREE</span>
              {!isPro && (
                <span className="px-2 py-0.5 bg-brand-500 text-white rounded-full text-[10px] font-bold">
                  {t('settings.plan_current_badge')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {t('settings.plan_free')}
            </p>
          </div>

          {/* PRO plan card */}
          <div
            className={`relative rounded-2xl border-2 p-4 space-y-3 transition-all ${
              isPro
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1">
                <Sparkles size={14} className="text-brand-500" />
                PRO
              </span>
              {isPro && (
                <span className="px-2 py-0.5 bg-brand-500 text-white rounded-full text-[10px] font-bold">
                  {t('settings.plan_current_badge')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {t('settings.plan_pro')}
            </p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t('settings.plan_price_pro')} {t('settings.plan_period_monthly')}
            </p>
            {!isPro && (
              <>
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="w-full mt-1 px-3 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  {upgrading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Zap size={13} />
                  )}
                  <span>{t('settings.upgrade_btn')}</span>
                </button>

                {/* Payment policy consent — shown under the upgrade button since it starts checkout */}
                <p className="text-[10px] leading-relaxed text-center text-slate-400 dark:text-slate-500">
                  {t('settings.upgrade_consent_prefix')}{' '}
                  <Link
                    href="/payment-refund"
                    target="_blank"
                    className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                  >
                    {t('settings.payment_policy_link')}
                  </Link>
                </p>

                {upgradeError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    <span>{upgradeError}</span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reset Data Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <RotateCcw size={18} />
            <span>{t('settings.reset_title')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings.reset_desc_detail')}
          </p>
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{t('settings.reset_warning')}</span>
          </p>
        </div>

        {resetSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center gap-2">
            <CheckCircle2 size={14} />
            <span>{locale === 'ar' ? 'تمت إعادة ضبط البيانات بنجاح.' : 'Data reset successfully.'}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleResetData}
          className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-bold transition-colors"
        >
          {t('settings.reset_btn')}
        </button>
      </div>
    </div>
  );
}
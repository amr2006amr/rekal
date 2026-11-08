'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { CEFRLevel, UserSettings } from '@/types';
import { clearUserData, DAILY_FREE_LIMIT } from '@/lib/storage';
import { LEVEL_ORDER } from '@/lib/data/words';
import { RotateCcw, Shield, User as UserIcon, LogOut, LogIn, Sparkles, CheckCircle2, AlertTriangle, Zap, Loader2, CreditCard } from 'lucide-react';

interface SubInfo {
  cancelled: boolean;
  status: string | null;
  renewsAt: string | null;
  endsAt: string | null;
}

async function getToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export default function SettingsPage() {
  const { t, locale } = useLanguage();
  const { user, signOut, settings, settingsLoading, updateSettings, refreshSettings } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  // Subscription management state
  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);
  const [managing, setManaging] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  const hasSubscription =
    settings?.subscription_status === 'active' || settings?.subscription_status === 'past_due';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load live subscription state (renewing vs cancelled, and the date).
  useEffect(() => {
    if (!user || !hasSubscription) {
      setSubInfo(null);
      return;
    }
    let aborted = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch('/api/subscription', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data: SubInfo = await res.json();
        if (!aborted) setSubInfo(data);
      } catch {
        // Non-critical: the buttons still work without the extra info.
      }
    })();
    return () => {
      aborted = true;
    };
  }, [user?.id, hasSubscription]);

  if (!mounted || settingsLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

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
      const token = await getToken();

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

  // Opens the Lemon Squeezy customer portal (update card, invoices, etc.)
  const handleManage = async () => {
    setSubError(null);
    setManaging(true);
    try {
      const token = await getToken();
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'portal_failed');
      window.location.href = data.url;
    } catch (err) {
      console.error('Portal error:', err);
      setSubError(
        locale === 'ar'
          ? 'تعذر فتح صفحة بيانات الاشتراك، حاول مرة أخرى'
          : 'Could not open subscription details, please try again'
      );
      setManaging(false);
    }
  };

  // Cancels auto-renewal (access remains until the end of the paid period).
  const handleCancelConfirmed = async () => {
    setSubError(null);
    setCancelling(true);
    try {
      const token = await getToken();
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch('/api/subscription', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'cancel_failed');
      setSubInfo(data);
      setShowCancelModal(false);
      setShowManageModal(false);
    } catch (err) {
      console.error('Cancel error:', err);
      setSubError(
        locale === 'ar' ? 'تعذر إلغاء الاشتراك، حاول مرة أخرى' : 'Could not cancel the subscription, please try again'
      );
    } finally {
      setCancelling(false);
    }
  };

  // Undo a cancellation while the paid period is still running.
  const handleResume = async () => {
    setSubError(null);
    setResuming(true);
    try {
      const token = await getToken();
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch('/api/subscription', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'resume_failed');
      setSubInfo(data);
    } catch (err) {
      console.error('Resume error:', err);
      setSubError(
        locale === 'ar' ? 'تعذر استئناف الاشتراك، حاول مرة أخرى' : 'Could not resume the subscription, please try again'
      );
    } finally {
      setResuming(false);
    }
  };

  const isPro = settings.subscription_status === 'active';
  const isPastDue = settings.subscription_status === 'past_due';
  const isCancelledPending = Boolean(subInfo?.cancelled);
  const accessEndDate = formatDate(subInfo?.endsAt ?? null);
  const renewDate = formatDate(subInfo?.renewsAt ?? null);

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

            {/* Not subscribed: upgrade button */}
            {!isPro && !isPastDue && (
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

            {/* Subscribed (or payment failed): manage + cancel */}
            {user && hasSubscription && (
              <div className="space-y-2 pt-1">
                {isPastDue && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-start gap-1">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <span>
                      {locale === 'ar'
                        ? 'فشلت عملية الدفع الأخيرة. حدّث بيانات بطاقتك للحفاظ على اشتراكك.'
                        : 'Your last payment failed. Update your card details to keep your plan.'}
                    </span>
                  </p>
                )}

                {/* Status line */}
                {isPro && subInfo && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isCancelledPending
                      ? locale === 'ar'
                        ? `تم إلغاء التجديد. اشتراكك فعّال حتى ${accessEndDate}.`
                        : `Renewal cancelled. Your plan stays active until ${accessEndDate}.`
                      : renewDate
                      ? locale === 'ar'
                        ? `يتجدد اشتراكك تلقائياً في ${renewDate}.`
                        : `Your plan renews automatically on ${renewDate}.`
                      : ''}
                  </p>
                )}

                {/* Single entry point: everything else (card, invoices, cancel) lives inside */}
                <button
                  type="button"
                  onClick={() => {
                    setSubError(null);
                    setShowManageModal(true);
                  }}
                  className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <CreditCard size={13} />
                  <span>{locale === 'ar' ? 'تعديل بيانات الاشتراك' : 'Manage subscription details'}</span>
                </button>

                {subError && !showManageModal && !showCancelModal && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    <span>{subError}</span>
                  </p>
                )}
              </div>
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

      {/* Manage subscription modal */}
      {showManageModal && !showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={() => !managing && !resuming && setShowManageModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {locale === 'ar' ? 'إدارة الاشتراك' : 'Manage subscription'}
              </h3>
              {isPro && subInfo && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isCancelledPending
                    ? locale === 'ar'
                      ? `تم إلغاء التجديد. اشتراكك فعّال حتى ${accessEndDate}.`
                      : `Renewal cancelled. Your plan stays active until ${accessEndDate}.`
                    : renewDate
                    ? locale === 'ar'
                      ? `يتجدد اشتراكك تلقائياً في ${renewDate}.`
                      : `Your plan renews automatically on ${renewDate}.`
                    : ''}
                </p>
              )}
            </div>

            {/* Main action: card, invoices, billing details */}
            <button
              type="button"
              onClick={handleManage}
              disabled={managing}
              className="w-full px-4 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              {managing ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
              <span>
                {locale === 'ar' ? 'تغيير البطاقة وعرض الفواتير' : 'Update card & view invoices'}
              </span>
            </button>

            {/* Resume, only after a cancellation while access still runs */}
            {isPro && isCancelledPending && (
              <button
                type="button"
                onClick={handleResume}
                disabled={resuming}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {resuming && <Loader2 size={15} className="animate-spin" />}
                <span>{locale === 'ar' ? 'إعادة تفعيل التجديد' : 'Resume subscription'}</span>
              </button>
            )}

            {subError && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle size={12} />
                <span>{subError}</span>
              </p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                {locale === 'ar' ? 'إغلاق' : 'Close'}
              </button>

              {/* Cancel: deliberately a small, quiet link at the very bottom */}
              {isPro && !isCancelledPending && (
                <button
                  type="button"
                  onClick={() => {
                    setSubError(null);
                    setShowCancelModal(true);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 underline underline-offset-2 transition-colors"
                >
                  {locale === 'ar' ? 'إلغاء الاشتراك' : 'Cancel subscription'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={() => !cancelling && setShowCancelModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {locale === 'ar' ? 'هل أنت متأكد من إلغاء الاشتراك؟' : 'Are you sure you want to cancel?'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {locale === 'ar'
                  ? `لن يتم تجديد اشتراكك الشهر القادم. ستستمر في استخدام PRO حتى ${
                      renewDate || 'نهاية الفترة المدفوعة'
                    }، ثم يعود حسابك إلى الخطة المجانية (${DAILY_FREE_LIMIT} مراجعة يومياً).`
                  : `Your subscription will not renew next month. You keep PRO until ${
                      renewDate || 'the end of your paid period'
                    }, then your account returns to the free plan (${DAILY_FREE_LIMIT} reviews per day).`}
              </p>
            </div>

            {subError && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle size={12} />
                <span>{subError}</span>
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-bold transition-colors"
              >
                {locale === 'ar' ? 'لا، أبقِ اشتراكي' : 'No, keep my plan'}
              </button>
              <button
                type="button"
                onClick={handleCancelConfirmed}
                disabled={cancelling}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                {cancelling && <Loader2 size={14} className="animate-spin" />}
                <span>{locale === 'ar' ? 'نعم، ألغِ الاشتراك' : 'Yes, cancel'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
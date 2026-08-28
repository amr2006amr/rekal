'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { Lock, Mail, Sparkles, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, isConfigured } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;

  // If already logged in, redirect to review
  useEffect(() => {
    if (user) {
      router.push('/review');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) return;

    // Signup-specific validation: confirm password match
    if (mode === 'signup') {
      if (!confirmPassword) return;
      if (password !== confirmPassword) {
        setErrorMsg(locale === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMsg(error.message || t('auth.error_generic'));
        } else {
          router.push('/review');
        }
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          setErrorMsg(error.message || t('auth.error_generic'));
        } else {
          setSuccessMsg(t('auth.success_signup'));
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || t('auth.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMsg(error.message || t('auth.error_generic'));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || t('auth.error_generic'));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">

        <h1 className="text-3xl font-black text-slate-900 dark:text-white">
          {mode === 'login' ? t('auth.login_title') : t('auth.signup_title')}
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {mode === 'login' ? t('auth.login_subtitle') : t('auth.signup_subtitle')}
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
        
        {/* Supabase Not Configured Warning (if env vars missing) */}
        {!isConfigured && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">{t('auth.supabase_not_configured')}</p>
              <p className="opacity-80">
                <code>NEXT_PUBLIC_SUPABASE_URL</code> & <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
              </p>
            </div>
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-bold text-sm rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-150 transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-60"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{t('auth.google_button')}</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
            {t('auth.or_divider')}
          </span>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('auth.email_label')}
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_placeholder')}
                className="w-full px-4 py-3 pe-11 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all dir-ltr"
              />
              <Mail size={16} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('auth.password_label')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password_placeholder')}
                className="w-full px-4 py-3 pe-11 ps-11 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all dir-ltr"
              />
              <Lock size={16} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password — only on signup */}
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={locale === 'ar' ? '••••••••' : '••••••••'}
                  className="w-full px-4 py-3 pe-11 ps-11 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all dir-ltr"
                />
                <Lock size={16} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-brand-500/25 transition-all duration-150 transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? t('auth.login_button') : t('auth.signup_button')}</span>
                <Arrow size={16} />
              </>
            )}
          </button>
        </form>

        {/* Switch Mode Footer */}
        <div className="text-center pt-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{mode === 'login' ? t('auth.no_account') : t('auth.have_account')}</span>{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setErrorMsg(null);
              setSuccessMsg(null);
              setConfirmPassword('');
            }}
            className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
          >
            {mode === 'login' ? t('auth.switch_to_signup') : t('auth.switch_to_login')}
          </button>
        </div>
      </div>
    </div>
  );
}
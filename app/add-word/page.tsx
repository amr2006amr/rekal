'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { WordItem, CustomWordItem, CustomWordUsageInfo } from '@/types';
import { AudioButton } from '@/components/AudioButton';
import { WordPreviewCard } from '@/components/WordPreviewCard';
import { getEffectiveCustomWords } from '@/lib/storage';
import {
  PlusCircle,
  Search,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lock,
  LogIn,
  Zap,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Clock,
  Layers,
  Check,
} from 'lucide-react';

export default function AddWordPage() {
  const { t, locale } = useLanguage();
  const { user, settings, settingsLoading } = useAuth();
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;

  // Search & input state
  const [wordInput, setWordInput] = useState('');
  const [inputErrorKey, setInputErrorKey] = useState<'empty' | 'min_length' | 'max_length' | 'invalid_chars' | null>(null);

  // Flow states
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Results
  const [searchResult, setSearchResult] = useState<{
    searched: boolean;
    found: boolean;
    source?: 'static' | 'custom';
    message?: string;
    word?: WordItem | CustomWordItem;
    normalizedWord?: string;
  } | null>(null);

  const [generatedPreview, setGeneratedPreview] = useState<WordItem | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ word: string; isStatic?: boolean } | null>(null);
  const [apiErrorInfo, setApiErrorInfo] = useState<{ key: string; message?: string } | null>(null);

  // Quota usage info
  const [usage, setUsage] = useState<CustomWordUsageInfo | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // User's custom words list
  const [myCustomWords, setMyCustomWords] = useState<WordItem[]>([]);
  const [loadingCustomWords, setLoadingCustomWords] = useState(false);

  // Fetch usage quota
  const fetchUsage = useCallback(async () => {
    if (!user) return;
    try {
      setUsageLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/custom-word/usage', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    } finally {
      setUsageLoading(false);
    }
  }, [user]);

  // Fetch list of user's custom words
  const fetchMyCustomWords = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingCustomWords(true);
      const words = await getEffectiveCustomWords(user.id);
      setMyCustomWords(words);
    } catch (err) {
      console.error('Failed to fetch custom words:', err);
    } finally {
      setLoadingCustomWords(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUsage();
      fetchMyCustomWords();
    }
  }, [user, fetchUsage, fetchMyCustomWords]);

  // Client-side Layer 1 validation
  const validateInput = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setInputErrorKey('empty');
      return false;
    }
    if (trimmed.length < 2) {
      setInputErrorKey('min_length');
      return false;
    }
    if (trimmed.length > 30) {
      setInputErrorKey('max_length');
      return false;
    }
    // Allow English letters, hyphens, and apostrophes
    const validCharsRegex = /^[a-zA-Z'-]+$/;
    if (!validCharsRegex.test(trimmed)) {
      setInputErrorKey('invalid_chars');
      return false;
    }
    setInputErrorKey(null);
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWordInput(e.target.value);
    if (inputErrorKey) {
      setInputErrorKey(null);
    }
    // Reset previous search result if user changes word
    if (searchResult) {
      setSearchResult(null);
    }
    if (generatedPreview) {
      setGeneratedPreview(null);
    }
    if (successInfo) {
      setSuccessInfo(null);
    }
    if (apiErrorInfo) {
      setApiErrorInfo(null);
    }
  };

  // 1. Search word
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateInput(wordInput)) return;

    setApiErrorInfo(null);
    setSuccessInfo(null);
    setGeneratedPreview(null);
    setSearchResult(null);
    setIsSearching(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setApiErrorInfo({ key: 'session_expired' });
        return;
      }

      const res = await fetch('/api/custom-word/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ word: wordInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setApiErrorInfo({ key: 'search_failed', message: data.message || data.error });
        return;
      }

      setSearchResult({
        searched: true,
        found: data.found,
        source: data.source,
        message: data.message,
        word: data.word,
        normalizedWord: data.normalizedWord || wordInput.trim().toLowerCase(),
      });
    } catch (err: any) {
      console.error('Search error:', err);
      setApiErrorInfo({ key: 'network_error' });
    } finally {
      setIsSearching(false);
    }
  };

  // 2. Add static word directly
  const handleAddStatic = async (wordId: string) => {
    setApiErrorInfo(null);
    setIsSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/custom-word/add-static', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ wordId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setApiErrorInfo({ key: 'add_failed', message: data.message || data.error });
        return;
      }

      setSuccessInfo({
        word: data.word?.word || wordInput.trim(),
        isStatic: true,
      });
      setSearchResult(null);
      setWordInput('');
      fetchMyCustomWords();
    } catch (err: any) {
      console.error('Add static error:', err);
      setApiErrorInfo({ key: 'add_failed' });
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Generate custom word
  const handleGenerate = async () => {
    setApiErrorInfo(null);
    setIsGenerating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const wordToGen = searchResult?.normalizedWord || wordInput.trim();

      const res = await fetch('/api/custom-word/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ word: wordToGen }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiErrorInfo({
          key: data.error || 'generate_failed',
          message: data.message,
        });
        return;
      }

      // Layer 2 semantic check: word not found in dictionaries
      if (!data.valid) {
        setApiErrorInfo({ key: 'unrecognized_word' });
        fetchUsage(); // Update attempt count
        return;
      }

      // Valid preview received
      setGeneratedPreview({
        id: 'preview-temp-id',
        ...data.preview,
      });
      setSearchResult(null);
      fetchUsage(); // Refresh quota after deduction
    } catch (err: any) {
      console.error('Generate error:', err);
      setApiErrorInfo({ key: 'generate_failed' });
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Save confirmed generated word
  const handleSaveConfirmed = async () => {
    if (!generatedPreview) return;
    setApiErrorInfo(null);
    setIsSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/custom-word/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(generatedPreview),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiErrorInfo({ key: 'save_failed', message: data.message || data.error });
        return;
      }

      setSuccessInfo({
        word: generatedPreview.word,
        isStatic: false,
      });
      setGeneratedPreview(null);
      setWordInput('');
      fetchMyCustomWords();
    } catch (err: any) {
      console.error('Save error:', err);
      setApiErrorInfo({ key: 'save_failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setGeneratedPreview(null);
    setApiErrorInfo(null);
  };

  const handleResetForm = () => {
    setWordInput('');
    setSearchResult(null);
    setGeneratedPreview(null);
    setSuccessInfo(null);
    setApiErrorInfo(null);
    setInputErrorKey(null);
  };

  // Loading state
  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Unauthenticated State (Matches ChatWidget / WordCard login prompt style)
  // ---------------------------------------------------------------------------
  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-10 px-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-xl shadow-slate-200/40 dark:shadow-none animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-950/50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto">
            <Lock size={30} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {locale === 'ar' ? 'سجّل دخولك لإضافة كلماتك الخاصة' : 'Sign in to add custom words'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {locale === 'ar'
                ? 'تحتاج لتسجيل الدخول لتتمكن من إضافة أي كلمة إنجليزية جديدة ومزامنتها مع مراجعاتك السحابية.'
                : 'Sign in to add any English word and sync it with your spaced repetition review queue.'}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-600/20 transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
            >
              <LogIn size={18} />
              <span>{locale === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPro = settings?.subscription_status === 'active';

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6 space-y-8 px-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {locale === 'ar' ? 'إضافة كلمة مخصصة' : 'Add Custom Word'}
            </h1>
            <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold border border-purple-200 dark:border-purple-800">
              SM-2
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {locale === 'ar'
              ? 'ابحث في المنهج الثابت أولاً، أو أضف كلمة جديدة لتنضم لمراجعاتك فوراً.'
              : 'Search the dictionary first, or add any new word to join your review queue directly.'}
          </p>
        </div>

        <Link
          href="/review"
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Layers size={14} />
          <span>{locale === 'ar' ? 'طابور المراجعة' : 'Review Queue'}</span>
          <Arrow size={14} />
        </Link>
      </div>

      {/* Quota / Usage Badge Banner */}
      {usage && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </div>
            <div>
              {isPro ? (
                <>
                  <div className="font-bold text-amber-600 dark:text-amber-400">
                    {locale === 'ar' ? 'حساب PRO مفعّل 🌟' : 'PRO Account Active 🌟'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {locale === 'ar'
                      ? 'يمكنك إضافة كلماتك اليومية ومراجعتها بالتكرار المتباعد.'
                      : 'Add daily words and master them with spaced repetition.'}
                  </p>
                </>
              ) : (
                <>
                  <div className="font-bold text-brand-600 dark:text-brand-400">
                    {locale === 'ar'
                      ? `حساب مجاني: متبقي لك ${usage.quota_remaining} من ${usage.quota_limit} كلمات`
                      : `Free Plan: ${usage.quota_remaining} of ${usage.quota_limit} words remaining`}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {locale === 'ar'
                      ? 'قم بالترقية لحساب PRO لإضافة كلمات جديدة كل يوم.'
                      : 'Upgrade to PRO to add new words every day.'}
                  </p>
                </>
              )}
            </div>
          </div>

          {!isPro && (
            <Link
              href="/settings"
              className="flex items-center gap-1 font-bold text-brand-600 hover:text-brand-500 dark:text-brand-400 transition-colors"
            >
              <Zap size={13} />
              <span>{locale === 'ar' ? 'ترقية لـ PRO للكلمات اليومية' : 'Upgrade to PRO'}</span>
            </Link>
          )}
        </div>
      )}

      {/* Main Input Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
            {locale === 'ar' ? 'الكلمة الإنجليزية المراد إضافتها:' : 'English Word to Add:'}
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                dir="ltr"
                value={wordInput}
                onChange={handleInputChange}
                placeholder=""
                disabled={isSearching || isGenerating || isSaving}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
              {wordInput && !isSearching && !isGenerating && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded-md"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearching || isGenerating || !wordInput.trim()}
              className="px-6 py-3.5 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-400 text-white font-bold rounded-2xl shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-2 transform active:scale-95"
            >
              {isSearching ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{locale === 'ar' ? 'جارٍ البحث...' : 'Searching...'}</span>
                </>
              ) : (
                <>
                  <Search size={18} />
                  <span>{locale === 'ar' ? 'بحث / إضافة' : 'Search / Add'}</span>
                </>
              )}
            </button>
          </div>

          {inputErrorKey && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 animate-in fade-in">
              <AlertCircle size={14} />
              <span>
                {inputErrorKey === 'empty'
                  ? (locale === 'ar' ? 'يرجى إدخال كلمة.' : 'Please enter a word.')
                  : inputErrorKey === 'min_length'
                  ? (locale === 'ar' ? 'يجب أن تتكون الكلمة من حرفين على الأقل.' : 'Word must be at least 2 characters long.')
                  : inputErrorKey === 'max_length'
                  ? (locale === 'ar' ? 'يجب ألا تتجاوز الكلمة 30 حرفاً.' : 'Word must not exceed 30 characters.')
                  : (locale === 'ar' ? 'يرجى إدخال حروف إنجليزية فقط (يُسمح بالشرطة - والفاصلة العليا \').' : 'Please enter English letters only (hyphen and apostrophe allowed).')}
              </span>
            </p>
          )}
        </form>

        {/* Global Alert Messages */}
        {apiErrorInfo && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-sm text-rose-800 dark:text-rose-200 rounded-2xl flex items-start gap-3 animate-in fade-in">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1">
              <p className="font-bold">{locale === 'ar' ? 'تنبيه' : 'Notice'}</p>
              <p className="text-xs leading-relaxed">
                {apiErrorInfo.key === 'free_total_limit_reached'
                  ? (locale === 'ar'
                      ? 'وصلت إلى الحد الأقصى للكلمات في الخطة المجانية (10 كلمات). يمكنك الترقية إلى رِكال PRO لإضافة المزيد من الكلمات يومياً!'
                      : 'You have reached the free tier limit of 10 words. Upgrade to PRO to add more words daily!')
                  : apiErrorInfo.key === 'pro_daily_limit_reached'
                  ? (locale === 'ar'
                      ? 'ما شاء الله! أضفت كلمات كثيرة اليوم 🌟 خذ قسطاً من الراحة لمراجعتها، ويمكنك إضافة المزيد غداً.'
                      : 'Great job! You added plenty of words today 🌟 Take a break to review them and add more tomorrow.')
                  : apiErrorInfo.key === 'daily_attempts_limit_reached'
                  ? (locale === 'ar'
                      ? 'قمت بعدد كبير من المحاولات اليوم. خذ قسطاً من الراحة لمراجعة كلماتك وتابع مجدداً غداً.'
                      : 'You have made many attempts today. Take a break to review and continue tomorrow.')
                  : apiErrorInfo.key === 'unrecognized_word'
                  ? (locale === 'ar'
                      ? 'لم نتمكن من العثور على هذه الكلمة في المعاجم الإنجليزية. يرجى التأكد من صحة كتابة الحروف والمحاولة مجدداً.'
                      : 'We could not find this word in English dictionaries. Please verify the spelling and try again.')
                  : apiErrorInfo.key === 'session_expired'
                  ? (locale === 'ar'
                      ? 'جلسة الدخول منتهية، يرجى تسجيل الدخول مجدداً.'
                      : 'Session expired. Please sign in again.')
                  : apiErrorInfo.key === 'search_failed'
                  ? (locale === 'ar'
                      ? 'تعذر البحث عن الكلمة، يرجى التحقق من اتصالك والمحاولة مجدداً.'
                      : 'Failed to search for word. Please check your connection and try again.')
                  : apiErrorInfo.key === 'network_error'
                  ? (locale === 'ar'
                      ? 'تعذر الاتصال بالسيرفر، يرجى التحقق من اتصالك والمحاولة مجدداً.'
                      : 'Could not connect to server. Please check your connection and try again.')
                  : apiErrorInfo.key === 'add_failed'
                  ? (locale === 'ar'
                      ? 'حدث خطأ أثناء إضافة الكلمة لمراجعاتك.'
                      : 'An error occurred while adding the word to your reviews.')
                  : apiErrorInfo.key === 'save_failed'
                  ? (locale === 'ar'
                      ? 'حدث خطأ أثناء حفظ الكلمة، يرجى المحاولة مجدداً.'
                      : 'Failed to save custom word. Please try again.')
                  : (apiErrorInfo.message || (locale === 'ar' ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.'))}
              </p>
            </div>
          </div>
        )}

        {successInfo && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-800 dark:text-emerald-200 rounded-2xl flex items-start gap-3 animate-in fade-in">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
            <div className="space-y-2 flex-1">
              <p className="font-bold">
                {locale === 'ar'
                  ? (successInfo.isStatic
                      ? `تمت إضافة كلمة "${successInfo.word}" إلى طابور مراجعاتك بنجاح!`
                      : `تم حفظ كلمة "${successInfo.word}" بنجاح وانضمت لطابور مراجعاتك!`)
                  : (successInfo.isStatic
                      ? `Word "${successInfo.word}" added to your review queue successfully!`
                      : `Word "${successInfo.word}" saved successfully and added to your review queue!`)}
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href="/review"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <span>{locale === 'ar' ? 'بدء المراجعة الآن' : 'Start Reviewing Now'}</span>
                  <Arrow size={12} />
                </Link>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                  {locale === 'ar' ? 'إضافة كلمة أخرى' : 'Add another word'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Results Display */}
        {searchResult && searchResult.searched && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in space-y-4">
            {/* Case A: Found in static curriculum */}
            {searchResult.found && searchResult.source === 'static' && searchResult.word && (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-600 text-white font-black text-xs rounded-full">
                      {searchResult.word.level}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {searchResult.word.word}
                    </h3>
                    <AudioButton word={searchResult.word.word} size="sm" />
                  </div>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <Check size={14} />
                    <span>{locale === 'ar' ? 'موجودة بالمنهج الثابت' : 'In Standard Dictionary'}</span>
                  </span>
                </div>

                <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {locale === 'ar'
                      ? (searchResult.word.definition_ar || searchResult.word.definition_en)
                      : (searchResult.word.definition_en || searchResult.word.definition_ar)}
                  </p>
                  {(locale === 'ar' ? searchResult.word.definition_en : searchResult.word.definition_ar) && (
                    <p className="text-xs text-slate-500 italic dir-ltr text-left">
                      {locale === 'ar'
                        ? searchResult.word.definition_en
                        : searchResult.word.definition_ar}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => handleAddStatic(searchResult.word!.id)}
                    disabled={isSaving}
                    className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>{locale === 'ar' ? 'جارٍ الإضافة...' : 'Adding...'}</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle size={14} />
                        <span>
                          {locale === 'ar' ? 'أضفها لمراجعاتي' : 'Add to My Reviews'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Case B: Found in user's previous custom words */}
            {searchResult.found && searchResult.source === 'custom' && searchResult.word && (
              <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-purple-600 text-white font-black text-xs rounded-full">
                      {locale === 'ar' ? 'كلمتي' : 'Custom'}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {searchResult.word.word}
                    </h3>
                    <AudioButton word={searchResult.word.word} size="sm" />
                  </div>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    {locale === 'ar' ? 'مضافة أصلاً لقائمتك' : 'Already in your list'}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {locale === 'ar'
                    ? (searchResult.word.definition_ar || searchResult.word.definition_en)
                    : (searchResult.word.definition_en || searchResult.word.definition_ar)}
                </p>

                <div className="pt-2">
                  <Link
                    href="/review"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline"
                  >
                    <span>{locale === 'ar' ? 'الانتقال لطابور المراجعة' : 'Go to Review Queue'}</span>
                    <Arrow size={12} />
                  </Link>
                </div>
              </div>
            )}

            {/* Case C: Not found in either source -> Add word */}
            {!searchResult.found && (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto">
                  <Sparkles size={24} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {locale === 'ar'
                      ? `الكلمة "${searchResult.normalizedWord}" غير موجودة بالقاعدة الثابتة`
                      : `Word "${searchResult.normalizedWord}" is not in the dictionary`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    {locale === 'ar'
                      ? 'يمكنك توليد بطاقة تعليمية متكاملة لهذه الكلمة مع نطقها وأمثلتها المترجمة.'
                      : 'You can generate a complete vocabulary card for this word with pronunciation and translated examples.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-8 py-3.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-400 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 mx-auto shadow-md shadow-purple-600/20 transition-all transform active:scale-95"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{locale === 'ar' ? 'جارٍ التجهيز...' : 'Preparing word...'}</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle size={16} />
                      <span>{locale === 'ar' ? 'إضافة' : 'Add'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generated Preview Card */}
      {generatedPreview && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 px-2">
            <Sparkles size={16} className="text-purple-500" />
            <span>{locale === 'ar' ? 'معاينة الكلمة:' : 'Word Preview:'}</span>
          </div>

          <WordPreviewCard
            word={generatedPreview}
            isLoading={isSaving}
            onConfirm={handleSaveConfirmed}
            onDiscard={handleDiscard}
            confirmLabel={locale === 'ar' ? 'أضف لمراجعاتي الآن' : 'Add to My Reviews'}
          />
        </div>
      )}

      {/* User's Custom Words Collection List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {locale === 'ar' ? 'كلماتي المضافة' : 'My Custom Words'}
            </h2>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold">
              {myCustomWords.length}
            </span>
          </div>

          <button
            type="button"
            onClick={fetchMyCustomWords}
            disabled={loadingCustomWords}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={12} className={loadingCustomWords ? 'animate-spin' : ''} />
            <span>{locale === 'ar' ? 'تحديث القائمة' : 'Refresh'}</span>
          </button>
        </div>

        {loadingCustomWords ? (
          <div className="py-8 flex items-center justify-center text-slate-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : myCustomWords.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs space-y-1">
            <BookOpen size={28} className="mx-auto opacity-50 mb-2" />
            <p className="font-semibold">
              {locale === 'ar'
                ? 'لم تقم بإضافة أي كلمات مخصصة بعد.'
                : 'You have not added any custom words yet.'}
            </p>
            <p>
              {locale === 'ar'
                ? 'اكتب أي كلمة إنجليزية في الحقل أعلاه لإضافتها لمراجعاتك.'
                : 'Type any English word above to generate and add it to your queue.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myCustomWords.map((cw) => (
              <div
                key={cw.id}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-start justify-between gap-3 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {cw.word}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold">
                      {cw.level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                    {locale === 'ar'
                      ? (cw.definition_ar || cw.definition_en)
                      : (cw.definition_en || cw.definition_ar)}
                  </p>
                </div>
                <AudioButton word={cw.word} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

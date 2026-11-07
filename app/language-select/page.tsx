'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function LanguageSelectPage() {
  const router = useRouter();
  const { setLocale } = useLanguage();
  const { user } = useAuth();

  const pick = (lang: 'ar' | 'en') => {
    setLocale(lang);
    router.push(user ? '/review' : '/login');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row">
      {/* Arabic half — RTL */}
      <button
        type="button"
        dir="rtl"
        onClick={() => pick('ar')}
        className="flex-1 flex flex-col items-center justify-center p-8 gap-4 bg-brand-600 hover:bg-brand-500 text-white transition-all duration-200 font-arabic cursor-pointer group"
      >
        <span className="text-4xl sm:text-5xl font-black leading-tight tracking-tight">
          العربية
        </span>
        <span className="text-base sm:text-lg opacity-90 font-medium text-center">
          هل تريد المتابعة باللغة العربية؟
        </span>
        <div className="mt-2 w-12 h-12 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
          <ArrowLeft size={24} className="transition-transform group-hover:-translate-x-1" />
        </div>
      </button>

      {/* Divider */}
      <div className="h-px md:h-auto md:w-px bg-white/20" />

      {/* English half — LTR */}
      <button
        type="button"
        dir="ltr"
        onClick={() => pick('en')}
        className="flex-1 flex flex-col items-center justify-center p-8 gap-4 bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 font-sans cursor-pointer group"
      >
        <span className="text-4xl sm:text-5xl font-black leading-tight tracking-tight">
          English
        </span>
        <span className="text-base sm:text-lg opacity-90 font-medium text-center">
          Continue in English?
        </span>
        <div className="mt-2 w-12 h-12 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
          <ArrowRight size={24} className="transition-transform group-hover:translate-x-1" />
        </div>
      </button>
    </div>
  );
}

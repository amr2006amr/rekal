'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, BarChart3, Settings as SettingsIcon, Sparkles, User as UserIcon, LogIn } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { getEffectiveSettings } from '@/lib/storage';
import { CEFRLevel } from '@/types';

export function Navbar() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const pathname = usePathname();
  const [level, setLevel] = useState<CEFRLevel>('B2');

  useEffect(() => {
    getEffectiveSettings(user?.id).then((settings) => {
      setLevel(settings.level || 'B2');
    });
  }, [pathname, user]);

  const navLinks = [
    { href: '/', label: t('nav.home'), icon: Home },
    { href: '/review', label: t('nav.review'), icon: BookOpen },
    { href: '/dashboard', label: t('nav.dashboard'), icon: BarChart3 },
    { href: '/settings', label: t('nav.settings'), icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group transition-transform active:scale-95"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Sparkles size={20} className="stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
              {t('app_name')}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              CEFR Spaced Repetition
            </span>
          </div>
        </Link>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-full border border-slate-200/80 dark:border-slate-800">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon size={15} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions (Level Badge + Language Switcher + User/Login) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Level Badge */}
          <Link
            href="/onboarding"
            title={t('dashboard.change_level')}
            className="flex items-center gap-1 px-2.5 py-1 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/80 border border-brand-200 dark:border-brand-800 rounded-full text-brand-700 dark:text-brand-300 text-xs font-bold transition-colors"
          >
            <span className="text-[10px] text-brand-500 font-normal">{t('nav.level')}</span>
            <span>{level}</span>
          </Link>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* User Profile / Login Button */}
          {user ? (
            <Link
              href="/settings"
              title={user.email || 'Account'}
              className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950 border border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 font-bold text-xs flex items-center justify-center transition-transform hover:scale-105"
            >
              {user.email ? user.email.charAt(0).toUpperCase() : <UserIcon size={14} />}
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-brand-600 dark:hover:bg-brand-500 text-white rounded-full text-xs font-bold transition-all shadow-sm"
            >
              <LogIn size={13} />
              <span className="hidden sm:inline">{t('nav.login')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 py-2 px-4 fixed bottom-0 left-0 right-0 z-40">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Locale } from '@/types';
import arMessages from '@/messages/ar.json';
import enMessages from '@/messages/en.json';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const messages: Record<Locale, any> = {
  ar: arMessages,
  en: enMessages,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('rekal_locale') as Locale;
    if (saved === 'ar' || saved === 'en') {
      setLocaleState(saved);
      document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = saved;
    } else {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rekal_locale', newLocale);
      document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = newLocale;
    }
  };

  const toggleLocale = () => {
    const next = locale === 'ar' ? 'en' : 'ar';
    setLocale(next);
  };

  // Helper to fetch nested keys like "home.hero_title"
  const t = (path: string): string => {
    const parts = path.split('.');
    let current = messages[locale];
    for (const part of parts) {
      if (current === undefined || current === null) return path;
      current = current[part];
    }
    return typeof current === 'string' ? current : path;
  };

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggleLocale, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { usageGuidelinesContent } from '@/lib/legal/usage-guidelines';
import PolicyPage from '@/components/PolicyPage';

export default function GuideClient() {
  const { locale } = useLanguage();
  return <PolicyPage content={usageGuidelinesContent[locale]} />;
}
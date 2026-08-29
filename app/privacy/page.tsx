'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { privacyPolicyContent } from '@/lib/legal/privacy-policy';
import PolicyPage from '@/components/PolicyPage';

export default function PrivacyPage() {
  const { locale } = useLanguage();
  return <PolicyPage content={privacyPolicyContent[locale]} />;
}
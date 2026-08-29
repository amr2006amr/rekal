'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { paymentRefundPolicyContent } from '@/lib/legal/payment-refund-policy';
import PolicyPage from '@/components/PolicyPage';

export default function PaymentRefundPage() {
  const { locale } = useLanguage();
  return <PolicyPage content={paymentRefundPolicyContent[locale]} />;
}
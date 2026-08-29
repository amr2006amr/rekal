'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Sparkles } from 'lucide-react';

const SUPPORT_EMAIL = 'amr.k.qaid@gmail.com';

export default function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-slate-900 dark:bg-black text-slate-300">
      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 gap-10">
        {/* Important Links */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white">{t('footer.important_links_title')}</h3>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                {t('footer.home')}
              </Link>
            </li>
            <li>
              <Link href="/guide" className="hover:text-white transition-colors">
                {t('footer.guide')}
              </Link>
            </li>
            <li>
              <Link href="/settings" className="hover:text-white transition-colors">
                {t('footer.settings')}
              </Link>
            </li>
            <li>
              <Link href="/settings" className="hover:text-white transition-colors">
                {t('footer.subscription')}
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact & Support */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white">{t('footer.contact_support_title')}</h3>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/privacy" className="hover:text-white transition-colors">
                {t('footer.privacy_policy')}
              </Link>
            </li>
            <li>
              <Link href="/payment-refund" className="hover:text-white transition-colors">
                {t('footer.payment_policy')}
              </Link>
            </li>
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition-colors">
                {t('footer.contact_us')}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Placeholder wordmark — swap for a real logo file whenever ready */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-brand-600 flex items-center justify-center">
              <Sparkles size={15} className="text-white" />
            </div>
            <span className="font-black text-white text-sm">Rekal</span>
          </div>

          <p className="text-xs text-slate-500">
            {t('footer.rights_reserved').replace('{year}', String(year))}
          </p>
        </div>
      </div>
    </footer>
  );
}
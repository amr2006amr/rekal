import type { Metadata } from 'next';
import GuideClient from '@/components/GuideClient';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rekal.online';

export const metadata: Metadata = {
  title: 'كيف يعمل رِكال؟ دليل حفظ المفردات بالتكرار المتباعد',
  description:
    'تعرّف على طريقة عمل رِكال: خوارزمية SM-2 للتكرار المتباعد، مستويات CEFR الخمسة، ونصائح عملية لحفظ مفردات إنجليزية جديدة بفعالية أكبر.',
  alternates: {
    canonical: `${BASE_URL}/guide`,
  },
  openGraph: {
    title: 'كيف يعمل رِكال؟ دليل حفظ المفردات بالتكرار المتباعد',
    description:
      'خوارزمية SM-2 للتكرار المتباعد، مستويات CEFR، ونصائح عملية لحفظ مفردات إنجليزية جديدة.',
    url: `${BASE_URL}/guide`,
    siteName: 'Rekal',
    locale: 'ar',
    type: 'article',
  },
};

export default function Page() {
  return <GuideClient />;
}
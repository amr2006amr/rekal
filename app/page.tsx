import type { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rekal.online';

export const metadata: Metadata = {
  title: 'رِكال (Rekal) — احفظ مفردات إنجليزية بالتكرار المتباعد',
  description:
    'رِكال تطبيق مجاني بواجهة عربية وإنجليزية لحفظ المفردات الإنجليزية بمنهجية CEFR وخوارزمية SM-2 للتكرار المتباعد، مع نطق صوتي وأمثلة لكل كلمة.',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: 'رِكال (Rekal) — احفظ مفردات إنجليزية بالتكرار المتباعد',
    description:
      'تطبيق مجاني بواجهة عربية وإنجليزية لحفظ المفردات الإنجليزية بمنهجية CEFR وخوارزمية SM-2، مع نطق صوتي وأمثلة لكل كلمة.',
    url: BASE_URL,
    siteName: 'Rekal',
    locale: 'ar',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'رِكال (Rekal) — احفظ مفردات إنجليزية بالتكرار المتباعد',
    description:
      'تطبيق مجاني بواجهة عربية وإنجليزية لحفظ المفردات الإنجليزية بمنهجية CEFR وخوارزمية SM-2.',
  },
};

// Structured data (JSON-LD) so search engines — and AI assistants that read
// schema.org markup — can understand exactly what this site is, its
// category, and that it's free to start, without guessing from prose alone.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Rekal (ركال)',
  alternateName: 'ركال',
  description:
    'تطبيق ويب بواجهة عربية وإنجليزية لحفظ المفردات الإنجليزية بمنهجية التكرار المتباعد (Spaced Repetition) وخوارزمية SM-2، مبني على مستويات CEFR.',
  url: BASE_URL,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any (Web)',
  inLanguage: ['ar', 'en'],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'خطة مجانية بحد 50 مراجعة يوميًا، وخطة PRO بمراجعات غير محدودة مقابل 5 دولار شهريًا.',
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
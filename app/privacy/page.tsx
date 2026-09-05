import type { Metadata } from 'next';
import PrivacyClient from '@/components/PrivacyClient';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rekal.online';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية — رِكال',
  description:
    'تعرّف على البيانات التي يجمعها رِكال، لماذا نجمعها، وكيف نحميها، ومن نشاركها معهم.',
  alternates: {
    canonical: `${BASE_URL}/privacy`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return <PrivacyClient />;
}
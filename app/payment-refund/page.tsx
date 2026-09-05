import type { Metadata } from 'next';
import PaymentRefundClient from '@/components/PaymentRefundClient';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rekal.online';

export const metadata: Metadata = {
  title: 'سياسة الدفع والاسترجاع — رِكال',
  description:
    'تفاصيل اشتراك خطة PRO الشهرية، كيفية معالجة الدفع عبر Lemon Squeezy، وسياسة الإلغاء والاسترجاع.',
  alternates: {
    canonical: `${BASE_URL}/payment-refund`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return <PaymentRefundClient />;
}
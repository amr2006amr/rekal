import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { Navbar } from '@/components/Navbar';
import ConditionalFooter from '@/components/ConditionalFooter';

export const metadata: Metadata = {
  title: 'رِكال (Rekal) — تطبيق مراجعة المفردات بالتكرار المتباعد',
  description: 'مراجعة كلمات إنجليزية بمنهجية CEFR وخوارزمية SM-2 بدون تعقيد',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased">
        <LanguageProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12">
              {children}
            </main>
            <ConditionalFooter />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
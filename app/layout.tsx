import type { Metadata } from 'next';
import './globals.css';
import { GoogleAnalytics } from '@next/third-parties/google';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { Navbar } from '@/components/Navbar';
import ConditionalFooter from '@/components/ConditionalFooter';

export const metadata: Metadata = {
  title: 'رِكال (Rekal) — تطبيق مراجعة المفردات بالتكرار المتباعد',
  description: 'مراجعة كلمات إنجليزية بمنهجية CEFR وخوارزمية SM-2 بدون تعقيد',
};

// Read once at the module level. Falls back to an empty string if the env
// var isn't set (e.g. local dev without .env.local configured yet), in
// which case we simply skip rendering the GoogleAnalytics component below
// instead of sending a broken/empty measurement id to Google.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

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

        {/*
          @next/third-parties injects the gtag.js script using Next.js's
          own Script optimization (loads after the page is interactive,
          doesn't block rendering) — better for performance than pasting
          Google's raw <script> tags directly into <head> by hand.

          Only rendered when the env var is actually set, so local dev
          without a configured GA id (or any other environment where you
          deliberately don't want analytics running) stays silent instead
          of erroring or sending empty/invalid data to Google.
        */}
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
      </body>
    </html>
  );
}
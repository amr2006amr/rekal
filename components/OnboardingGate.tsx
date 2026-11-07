'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getEffectiveSettings, saveEffectiveSettings } from '@/lib/storage';

/** Paths that are always accessible — no gate checks applied. */
const PUBLIC_PATHS = ['/language-select', '/login', '/auth'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

/**
 * Client-side onboarding gate.
 *
 * Enforces the flow:
 *   1. Language chosen  →  2. Signed in  →  3. CEFR level set  →  4. App
 */
export default function OnboardingGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, settings, settingsLoading, setLocalSettings } = useAuth();
  const { setLocale } = useLanguage();

  const [gateReady, setGateReady] = useState(false);
  const hasResolved = useRef(false);
  const isSyncingLocale = useRef(false);

  useEffect(() => {
    // 0. If still loading auth or settings for the first time, wait
    if (authLoading || settingsLoading) {
      console.log(`[OnboardingGate] Path: ${pathname} | Status: Loading auth/settings | Action: Wait (spinner)`);
      return;
    }

    // Public paths are always rendered immediately
    if (isPublicPath(pathname)) {
      console.log(`[OnboardingGate] Path: ${pathname} | Status: Public path | Action: Allow immediately`);
      setGateReady(true);
      return;
    }

    // 1. Check Language
    const storedLocale = typeof window !== 'undefined' ? localStorage.getItem('rekal_locale') : null;
    const accountLocale = settings?.locale;

    // After login: if user has locale in account but not in localStorage,
    // apply account locale and write to localStorage
    if (user && accountLocale && (accountLocale === 'ar' || accountLocale === 'en') && !storedLocale) {
      setLocale(accountLocale as 'ar' | 'en');
    }

    const effectiveLocale = storedLocale || (user && accountLocale ? accountLocale : null);

    if (!effectiveLocale) {
      console.log(`[OnboardingGate] Path: ${pathname} | Locale: None | Action: Redirect -> /language-select`);
      hasResolved.current = false;
      setGateReady(false);
      router.replace('/language-select');
      return;
    }

    // 2. Check Authentication
    if (!user) {
      console.log(`[OnboardingGate] Path: ${pathname} | Locale: ${effectiveLocale} | User: None | Action: Redirect -> /login`);
      hasResolved.current = false;
      setGateReady(false);
      router.replace('/login');
      return;
    }

    // Background sync: If user has chosen a language but account lacks it, save to account
    if (effectiveLocale && !accountLocale && !isSyncingLocale.current) {
      isSyncingLocale.current = true;
      const updated = {
        ...(settings || {
          level: 'B2',
          daily_reviews_used: 0,
          daily_reset_at: new Date().toISOString(),
          subscription_status: 'free' as const,
        }),
        locale: effectiveLocale,
      };
      setLocalSettings(updated);
      saveEffectiveSettings(updated, user.id)
        .catch((err) => {
          console.error('[OnboardingGate] Failed to sync locale to user account:', err);
        })
        .finally(() => {
          isSyncingLocale.current = false;
        });
    }

    // 3. Check Level (Onboarding)
    if (!settings?.level) {
      // If we are already on /onboarding, allow render
      if (pathname === '/onboarding') {
        console.log(`[OnboardingGate] Path: ${pathname} | User: ${user.email} | Level: None | Action: Allow /onboarding render`);
        setGateReady(true);
        return;
      }

      // Check fresh settings in case user just completed /onboarding
      let isMounted = true;
      (async () => {
        try {
          const fresh = await getEffectiveSettings(user.id);
          if (!isMounted) return;
          if (fresh?.level) {
            console.log(`[OnboardingGate] Path: ${pathname} | Fresh Level detected: ${fresh.level} | Action: Allow render`);
            setLocalSettings(fresh);
            hasResolved.current = true;
            setGateReady(true);
          } else {
            console.log(`[OnboardingGate] Path: ${pathname} | User: ${user.email} | Level: None | Action: Redirect -> /onboarding`);
            hasResolved.current = false;
            setGateReady(false);
            router.replace('/onboarding');
          }
        } catch (err) {
          console.error('[OnboardingGate] Error checking fresh settings:', err);
          if (isMounted) {
            setGateReady(true); // Don't block user on error
          }
        }
      })();
      return;
    }

    // 4. All checks passed: language + user + level are verified
    console.log(`[OnboardingGate] Path: ${pathname} | User: ${user.email} | Level: ${settings.level} | Locale: ${effectiveLocale} | Action: ALL RESOLVED -> Allow render`);
    hasResolved.current = true;
    setGateReady(true);
  }, [
    authLoading,
    settingsLoading,
    pathname,
    user,
    settings?.level,
    settings?.locale,
    router,
    setLocale,
    setLocalSettings,
  ]);

  // Loading spinner during initial auth/settings resolution OR before gate resolves.
  // Once hasResolved.current is true, internal page navigation NEVER shows spinner!
  const showSpinner =
    !hasResolved.current &&
    !isPublicPath(pathname) &&
    (authLoading || settingsLoading || !gateReady);

  if (showSpinner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

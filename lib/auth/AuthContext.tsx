'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getEffectiveSettings, saveEffectiveSettings } from '@/lib/storage';
import { UserSettings } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  settings: UserSettings | null;
  settingsLoading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (updated: UserSettings) => Promise<void>;
  setLocalSettings: (updated: UserSettings) => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  // Load settings once whenever the user identity changes (login/logout/guest)
  useEffect(() => {
    let cancelled = false;
    setSettingsLoading(true);
    getEffectiveSettings(user?.id).then((s) => {
      if (!cancelled) {
        setSettings(s);
        setSettingsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const refreshSettings = useCallback(async () => {
    const s = await getEffectiveSettings(user?.id);
    setSettings(s);
  }, [user?.id]);

  const updateSettings = useCallback(
    async (updated: UserSettings) => {
      setSettings(updated); // Optimistic local update — instant UI feedback
      await saveEffectiveSettings(updated, user?.id);
    },
    [user?.id]
  );

  /**
   * Update the in-memory settings only, without writing to the database.
   *
   * Use this after a server call that already persisted the new settings
   * itself (e.g. POST /api/review, which returns the freshly-saved
   * settings). Calling `updateSettings` in that situation would trigger a
   * second, redundant write to Supabase and the extra network round trip
   * is what causes a noticeable delay before moving to the next review
   * card. This setter just syncs local state with what the server already
   * confirmed.
   */
  const setLocalSettings = useCallback((updated: UserSettings) => {
    setSettings(updated);
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    if (!isConfigured) {
      return { error: new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY') };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!isConfigured) {
      return { error: new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY') };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    if (!isConfigured) {
      return { error: new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY') };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (!isConfigured) {
      return { error: null };
    }
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSettings(null);
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured,
        settings,
        settingsLoading,
        refreshSettings,
        updateSettings,
        setLocalSettings,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
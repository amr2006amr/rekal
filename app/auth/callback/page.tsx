'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = '/review';
      } else {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    };
    checkSession();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500 font-medium">جاري إكمال تسجيل الدخول...</p>
    </div>
  );
}
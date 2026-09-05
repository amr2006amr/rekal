'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bot,
  X,
  Send,
  Loader2,
  AlertCircle,
  Zap,
  Lock,
  LogIn,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { ChatMessage, ChatUsageInfo } from '@/types';

export default function ChatWidget() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usage, setUsage] = useState<ChatUsageInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom whenever messages or loading changes
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Fetch usage quota when user opens chat
  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;
    const fetchUsage = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const res = await fetch('/api/chat', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setUsage(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch chat usage:', err);
      }
    };

    fetchUsage();
    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  // Focus input when chat window opens for authenticated user
  useEffect(() => {
    if (isOpen && user) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, user]);

  const handleToggle = () => {
    // Opens normally for everyone; unauthenticated state is handled inside the modal
    setIsOpen((prev) => !prev);
    setErrorMsg(null);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        router.push('/login');
        return;
      }

      // Context truncation: send only the last 10 messages to the server
      const payloadMessages = newMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.status === 429 || data.error === 'daily_limit_reached') {
        if (data.usage) {
          setUsage(data.usage);
        }
        setErrorMsg(
          locale === 'ar'
            ? `وصلت للحد اليومي للرسائل (${data.usage?.daily_limit ?? 7} رسائل). يمكنك الترقية إلى PRO للحصول على وصول يومي سخي.`
            : `You have reached your daily message limit (${data.usage?.daily_limit ?? 7} messages). Upgrade to PRO for generous daily access.`
        );
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || 'chat_failed');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
      if (data.usage) {
        setUsage(data.usage);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMsg(t('chat.error_generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper to format bot message lines into readable blocks
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      // Check if line is a bullet item
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
      const cleanLine = isBullet ? trimmed.substring(2) : line;

      // Basic bold parsing: **bold**
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-slate-900 dark:text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-1.5 my-0.5">
            <span className="text-brand-500 font-bold text-xs mt-1">•</span>
            <span className="flex-1">{renderedParts}</span>
          </div>
        );
      }

      return (
        <p key={idx} className="leading-relaxed my-0.5">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Widget Trigger Button (Always fixed at bottom-left) */}
      <aside
        aria-label={t('chat.widget_title')}
        className="fixed bottom-5 left-5 z-50 flex items-center justify-center pointer-events-auto"
      >
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-label={isOpen ? t('chat.close') : t('chat.open')}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-brand-600 via-emerald-500 to-teal-400 text-white shadow-xl shadow-brand-500/25 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white/20"
        >
          {isOpen ? (
            <X size={24} className="stroke-[2.5] transition-transform" />
          ) : (
            <>
              <Bot size={26} className="stroke-[2.2] transition-transform" />
              {/* Subtle active status indicator dot */}
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
              </span>
            </>
          )}
        </button>
      </aside>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={t('chat.widget_title')}
          className="fixed bottom-22 left-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[390px] h-[550px] max-h-[80vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <header className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/70 dark:from-slate-900 dark:to-slate-850 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center text-white shadow-sm shrink-0">
                <Bot size={18} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {t('chat.widget_title')}
                  </span>
                </div>

                {/* Subtitle / Quota: PRO gets fixed badge, Free gets actual count + upgrade link */}
                {user ? (
                  usage?.is_pro ? (
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 leading-tight">
                      {t('chat.pro_badge')}
                    </span>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        {usage
                          ? (locale === 'ar'
                              ? `متبقي اليوم: ${usage.remaining} من ${usage.daily_limit}`
                              : `${usage.remaining} of ${usage.daily_limit} left today`)
                          : t('chat.status_online')}
                      </span>
                      <Link
                        href="/settings"
                        onClick={() => setIsOpen(false)}
                        className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline leading-tight mt-0.5"
                      >
                        {t('chat.upgrade_prompt')}
                      </Link>
                    </div>
                  )
                ) : (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {t('chat.status_online')}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors shrink-0"
              aria-label={t('chat.close')}
            >
              <X size={18} />
            </button>
          </header>

          {/* Body */}
          {!user ? (
            /* Unauthenticated user state inside modal */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-inner">
                <Lock size={26} />
              </div>
              <div className="space-y-1 max-w-[260px]">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {t('chat.bot_name')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('chat.login_required_desc')}
                </p>
              </div>
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all"
              >
                <LogIn size={15} />
                <span>{t('chat.login_button')}</span>
              </Link>
            </div>
          ) : (
            /* Authenticated Chat Experience */
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm">
                {/* Permanent static welcome message bubble (UI only, never sent to Gemini) */}
                <div className="flex flex-col items-start">
                  <div className="px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm max-w-[90%] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-200/80 dark:border-slate-700/60 shadow-xs leading-relaxed">
                    {t('chat.welcome_static_message')}
                  </div>
                </div>

                {/* Render conversation messages */}
                {messages.map((m) => {
                  const isUser = m.role === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm max-w-[85%] ${
                          isUser
                            ? 'bg-brand-600 text-white rounded-br-sm shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-200/80 dark:border-slate-700/60 shadow-xs'
                        }`}
                      >
                        {isUser ? m.content : renderMessageContent(m.content)}
                      </div>
                    </div>
                  );
                })}

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-1.5 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce"></span>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                      <span className="leading-relaxed">{errorMsg}</span>
                    </div>
                    {usage && usage.remaining === 0 && !usage.is_pro && (
                      <Link
                        href="/settings"
                        onClick={() => setIsOpen(false)}
                        className="self-start flex items-center gap-1 px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-bold text-[11px] transition-colors mt-0.5 shadow-xs"
                      >
                        <Zap size={12} />
                        <span>{t('chat.upgrade_button')}</span>
                      </Link>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Footer Input */}
              <footer className="p-3 bg-slate-50/90 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('chat.input_placeholder')}
                    disabled={isLoading || (usage !== null && usage.remaining <= 0)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-850"
                  />
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading || (usage !== null && usage.remaining <= 0)}
                    className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 disabled:opacity-50 disabled:hover:bg-brand-600 disabled:active:scale-100 text-white transition-all shadow-sm flex items-center justify-center shrink-0"
                    aria-label={t('chat.send')}
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </footer>
            </>
          )}
        </div>
      )}
    </>
  );
}

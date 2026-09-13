'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2 } from 'lucide-react';

interface AudioButtonProps {
  word: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Module-level cache for voices and preferred voice
let cachedVoice: SpeechSynthesisVoice | null = null;
let isVoicesInitialized = false;

function selectBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
  if (englishVoices.length === 0) return voices[0] || null;

  // 1. High-priority: Local natural/clear voices (0 network latency, instant playback)
  // On Windows: Microsoft Zira/Jenny. On Mac/iOS: Samantha
  const preferredLocal = englishVoices.find(
    (v) => v.localService && (v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Natural'))
  );
  if (preferredLocal) return preferredLocal;

  // 2. Any other local English voice (David, Mark, etc. - local on device)
  const anyLocal = englishVoices.find((v) => v.localService);
  if (anyLocal) return anyLocal;

  // 3. Fallback to remote voices (Google US English, etc.) if no local voice exists
  const preferredRemote = englishVoices.find(
    (v) => v.name.includes('Natural') || v.name.includes('Google')
  );
  if (preferredRemote) return preferredRemote;

  // 4. Default English voice
  return englishVoices.find((v) => v.default) || englishVoices[0];
}

function initVoices(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoice = selectBestVoice(voices);
    isVoicesInitialized = true;
    return cachedVoice;
  }
  return null;
}

// Pre-initialize voices as early as possible in the browser
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  initVoices();
  if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = () => {
      initVoices();
    };
  }
}

export function AudioButton({ word, size = 'md', className = '' }: AudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-load voices on component mount
  useEffect(() => {
    initVoices();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const playAudio = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        alert('Speech synthesis is not supported in this browser.');
        return;
      }

      // Cancel any ongoing speech and ensure synthesis is unpaused (Chrome bug fix)
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9; // Clear, comfortable pace for learners

      // Use cached voice or try to find best voice now
      const voice = cachedVoice || initVoices();
      if (voice) {
        utterance.voice = voice;
      }

      const cleanup = () => {
        setIsPlaying(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };

      utterance.onstart = () => {
        setIsPlaying(true);
        // Safety watchdog: reset state after reasonable duration if browser stalls onend
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const estimatedDurationMs = Math.max(3000, word.split(' ').length * 1500);
        timeoutRef.current = setTimeout(cleanup, estimatedDurationMs);
      };

      utterance.onend = cleanup;
      utterance.onerror = cleanup;

      window.speechSynthesis.speak(utterance);
    },
    [word]
  );

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2.5 text-sm',
    lg: 'p-3.5 text-base',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 26,
  };

  return (
    <button
      type="button"
      onClick={playAudio}
      onMouseEnter={initVoices}
      title="Listen to pronunciation"
      className={`inline-flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
        isPlaying
          ? 'bg-brand-500 text-white scale-110 shadow-lg shadow-brand-500/30 ring-2 ring-brand-400'
          : 'bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
      } ${sizeClasses[size]} ${className}`}
      aria-label={`Pronounce ${word}`}
    >
      <Volume2
        size={iconSizes[size]}
        className={isPlaying ? 'animate-pulse' : ''}
      />
    </button>
  );
}

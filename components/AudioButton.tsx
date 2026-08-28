'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioButtonProps {
  word: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AudioButton({ word, size = 'md', className = '' }: AudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    // Cancel ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // Slightly clearer pace for learners

    // Try to pick a natural sounding English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

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

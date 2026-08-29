'use client';

import React from 'react';
import { PolicyBlock, PolicyContent } from '@/lib/legal/privacy-policy';

export default function PolicyPage({ content }: { content: PolicyContent }) {
  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {content.title}
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">{content.lastUpdated}</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-4">
        {content.blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>
    </div>
  );
}

function Block({ block }: { block: PolicyBlock }) {
  switch (block.type) {
    case 'h2':
      return (
        <h2 className="text-lg font-black text-slate-900 dark:text-white pt-2">
          {block.text}
        </h2>
      );
    case 'p':
      return (
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {block.text}
        </p>
      );
    case 'ul':
      return (
        <ul className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 list-disc ps-5">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'callout':
      return (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
          {block.text}
        </div>
      );
    default:
      return null;
  }
}
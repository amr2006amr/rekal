'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();

  // Hide the footer during an active review session so it doesn't
  // distract from focus. Shown on every other page.
  const hideOnReview = pathname?.startsWith('/review');

  if (hideOnReview) return null;

  return <Footer />;
}
import { MetadataRoute } from 'next';
import { getAllWords } from '@/lib/data/words';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rekal.online';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Only public, marketing/informational pages belong here. Pages that
  // require a signed-in user (dashboard, review, settings, onboarding,
  // auth callback) are deliberately excluded — there's nothing for a
  // search engine to index there, and indexing them would just waste
  // crawl budget on pages Google can't meaningfully rank anyway.
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/guide`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/payment-refund`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const wordRoutes: MetadataRoute.Sitemap = getAllWords().map((word) => ({
    url: `${BASE_URL}/word/${word.id}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...wordRoutes];
}
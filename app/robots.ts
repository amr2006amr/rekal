import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rekal.online';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private, user-specific pages — nothing here is meaningful to a
      // search engine, and crawling them wastes crawl budget. /api is
      // blocked since those are data endpoints, not pages.
      disallow: [
        '/dashboard',
        '/review',
        '/settings',
        '/onboarding',
        '/auth/',
        '/api/',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
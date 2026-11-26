import type { MetadataRoute } from 'next';
import { getPublicAppUrl } from '../lib/public-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/account',
        '/cards',
        '/admin',
        '/login',
        '/register',
        '/prototypes',
      ],
    },
    sitemap: `${getPublicAppUrl()}/sitemap.xml`,
  };
}

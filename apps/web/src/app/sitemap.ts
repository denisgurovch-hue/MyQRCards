import type { MetadataRoute } from 'next';
import { getPublicAppUrl } from '../lib/public-url';

/** Marketing URLs only — never enumerate `/u/{slug}` card pages. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${getPublicAppUrl()}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
